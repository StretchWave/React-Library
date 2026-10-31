// Honest preview renderer. The card decides from the canonical preview profile:
//   - low/medium-cost, autoplay-capable live previews mount only while visible;
//   - expensive, paused, reduced-motion and static cards use the real captured
//     component screenshot published by `npm run capture:previews`;
//   - external references show an explicit reference tile, never a screenshot
//     of this app pretending to be the source component;
//   - failures are labelled and offer a retry, never a silent success state.
//
// Third-party code still executes only through the reviewed showcase/demo
// registry, never directly from vendored source inside the gallery.
import { Component, useCallback, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import type { ComponentType } from "react";
import { getDemo } from "../../catalog/demos";
import { sourceById } from "../../catalog/client";
import { entryTypeOf, type CatalogEntry, type PreviewType } from "../../catalog/types";
import {
  preferredPreviewKind,
  profileOf,
  previewStatusLabel,
  snapshotUrl,
} from "../../catalog/preview";
import type { ShowcaseValues } from "../../catalog/showcases";
import { isMotionPlaying, subscribeMotion } from "../../lib/motion";

type ShowcaseRegistry = typeof import("../../catalog/showcases");

let showcaseRegistryPromise: Promise<ShowcaseRegistry> | null = null;

function loadShowcaseRegistry(): Promise<ShowcaseRegistry> {
  if (!showcaseRegistryPromise) {
    showcaseRegistryPromise = import("../../catalog/showcases").catch((error: unknown) => {
      showcaseRegistryPromise = null;
      throw error;
    });
  }
  return showcaseRegistryPromise;
}

export type PreviewKind = PreviewType;

/** Compatibility helper used by tests and the inspector. */
export function previewKind(entry: CatalogEntry): PreviewKind {
  const profile = profileOf(entry);
  if (profile.mode === "external") return "external";
  if (profile.mode === "unavailable") return "none";
  if (entryTypeOf(entry) === "local" && getDemo(entry.id)) return "local-demo";
  return entry.preview?.type ?? "local-demo";
}

function prefersReducedMotion(): boolean {
  try {
    return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(prefersReducedMotion);
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(media.matches);
    media.addEventListener?.("change", onChange);
    return () => media.removeEventListener?.("change", onChange);
  }, []);
  return reduced;
}

function useVisible(ref: React.RefObject<HTMLElement | null>): boolean {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const host = ref.current;
    if (!host) return;
    if (typeof IntersectionObserver !== "function") {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      (records) => {
        for (const record of records) {
          if (record.target === host) setVisible(record.isIntersecting);
        }
      },
      { rootMargin: "120px" },
    );
    observer.observe(host);
    return () => observer.disconnect();
  }, [ref]);
  return visible;
}

interface BoundaryProps {
  children: ReactNode;
  fallback: ReactNode;
  resetKey: number;
}

class PreviewBoundary extends Component<BoundaryProps, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidUpdate(previous: BoundaryProps) {
    if (previous.resetKey !== this.props.resetKey && this.state.failed) {
      this.setState({ failed: false });
    }
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

interface MiniStageProps {
  entry: CatalogEntry;
  Component: ComponentType<ShowcaseValues> | null;
  interactive: boolean;
}

function MiniStage({ entry, Component, interactive }: MiniStageProps) {
  if (!Component) {
    return <SnapshotImage entry={entry} label="Loading live preview..." />;
  }
  return (
    <div
      className="preview-mini-stage"
      aria-label={`Live miniature preview of ${entry.name}`}
      data-interactive={interactive ? "true" : undefined}
    >
      <div className="preview-mini-scaler" aria-hidden="true">
        <Component />
      </div>
    </div>
  );
}

function SnapshotImage({ entry, label }: { entry: CatalogEntry; label?: string }) {
  const url = snapshotUrl(entry);
  if (!url) {
    return (
      <div className="preview-frame is-empty" data-preview-kind="none">
        <span className="preview-frame-cue" aria-hidden="true">
          !
        </span>
        <p>{label ?? "No snapshot has been captured for this component yet."}</p>
      </div>
    );
  }
  return (
    <div className="preview-frame is-snapshot" data-preview-kind="snapshot">
      <img src={url} alt={`Captured preview of ${entry.name}`} loading="lazy" decoding="async" />
      {label ? <span className="preview-mini-kindchip">{label}</span> : null}
    </div>
  );
}

function ExternalPreview({ entry }: { entry: CatalogEntry }) {
  const source = entry.source ? sourceById(entry.source) : undefined;
  const url = entry.preview?.url ?? entry.sourceUrl;
  return (
    <div className="preview-frame is-external" data-preview-kind="external">
      <span className="preview-external-mark" aria-hidden="true">
        {"\u2197"}
      </span>
      <span className="preview-external-source">{source?.name ?? "External source"}</span>
      <span className="preview-external-note">
        {url ? "Official preview linked in the inspector" : "Official link missing from the record"}
      </span>
    </div>
  );
}

export interface PreviewBoxProps {
  entry: CatalogEntry;
  /** Deliberate hover previews may run entries the gallery keeps on snapshots. */
  forceLive?: boolean;
}

export function PreviewBox({ entry, forceLive = false }: PreviewBoxProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const visible = useVisible(hostRef);
  const motionOn = useSyncExternalStore(subscribeMotion, isMotionPlaying);
  const reducedMotion = usePrefersReducedMotion();
  const [registry, setRegistry] = useState<ShowcaseRegistry | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [retryNonce, setRetryNonce] = useState(0);
  const profile = profileOf(entry);
  // Seed demos are already part of the shell; do not pull the whole showcase
  // chunk (and its WebGL/three runtime) just to run one of them on hover.
  const SeedDemo = getDemo(entry.id);

  const requestComponent = useCallback(() => {
    if (registry) return;
    setLoadFailed(false);
    void loadShowcaseRegistry()
      .then(setRegistry)
      .catch(() => setLoadFailed(true));
  }, [registry]);

  const kind = preferredPreviewKind(entry, {
    globalPaused: !motionOn,
    reducedMotion,
    visible,
    forceLive,
  });

  useEffect(() => {
    if (kind === "live" && !SeedDemo) requestComponent();
  }, [kind, requestComponent, SeedDemo]);

  if (kind === "external") {
    return (
      <div ref={hostRef} className="preview-shell">
        <ExternalPreview entry={entry} />
      </div>
    );
  }

  if (kind === "unavailable") {
    return (
      <div ref={hostRef} className="preview-shell">
        <div className="preview-frame is-empty" data-preview-kind="none">
          <span className="preview-frame-cue" aria-hidden="true">
            !
          </span>
          <p>{profile.failureReason ?? "No local preview is available for this component."}</p>
        </div>
      </div>
    );
  }

  if (kind === "snapshot") {
    const label =
      profile.cost === "high"
        ? "Live in workspace"
        : !motionOn
          ? "Previews paused"
          : profile.autoplayAllowed
            ? undefined
            : previewStatusLabel(entry);
    return (
      <div ref={hostRef} className="preview-shell" data-preview-status={profile.previewStatus}>
        <SnapshotImage entry={entry} label={label} />
      </div>
    );
  }

  const showcase = registry?.getShowcase(entry.id);
  const DemoComponent = showcase?.Component ?? SeedDemo ?? null;
  const interactive = (entry.behaviors ?? []).some((behavior) =>
    ["cursor-reactive", "hover", "gesture", "interactive-text", "interactive-nav", "stateful"].includes(behavior),
  );
  const retry = () => {
    setRetryNonce((value) => value + 1);
    setLoadFailed(false);
    requestComponent();
  };
  const fallback = (
    <div className="preview-failed">
      <SnapshotImage entry={entry} label="Live preview failed - captured snapshot" />
      <button type="button" className="preview-regenerate" onClick={retry}>
        Retry live preview
      </button>
    </div>
  );

  return (
    <div ref={hostRef} className="preview-shell" data-preview-status={profile.previewStatus}>
      {DemoComponent === null ? (
        <div className="preview-failed">
          <SnapshotImage
            entry={entry}
            label={
              loadFailed
                ? "Live preview unavailable - captured snapshot"
                : "Loading live preview..."
            }
          />
          {loadFailed ? (
            <button type="button" className="preview-regenerate" onClick={retry}>
              Retry live preview
            </button>
          ) : null}
        </div>
      ) : (
        <PreviewBoundary fallback={fallback} resetKey={retryNonce}>
          <MiniStage entry={entry} Component={DemoComponent} interactive={interactive} />
        </PreviewBoundary>
      )}
    </div>
  );
}
