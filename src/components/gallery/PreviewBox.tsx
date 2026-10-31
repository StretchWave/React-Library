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
import { Component, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import type { ComponentType } from "react";
import { getDemo } from "../../catalog/demos";
import { sourceById } from "../../catalog/client";
import { loadShowcase, peekShowcase, type Showcase } from "../../catalog/showcases";
import { entryTypeOf, type CatalogEntry, type PreviewType } from "../../catalog/types";
import {
  preferredPreviewKind,
  profileOf,
  previewStatusLabel,
  snapshotUrl,
} from "../../catalog/preview";
import type { ShowcaseValues } from "../../catalog/showcases";
import { isMotionPlaying, subscribeMotion } from "../../lib/motion";

type ShowcaseLoadState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; showcase?: Showcase }
  | { status: "failed"; message: string };

/** Loads exactly the selected entry's showcase group; caches through the
 *  registry. Off-screen/non-live cards never trigger a request. */
function useEntryShowcase(id: string, enabled: boolean, retryNonce: number): ShowcaseLoadState & { retry: () => void } {
  const [state, setState] = useState<ShowcaseLoadState>(() => {
    const cached = peekShowcase(id);
    return cached ? { status: "ready", showcase: cached } : { status: "idle" };
  });
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    const cached = peekShowcase(id);
    if (cached) {
      setState({ status: "ready", showcase: cached });
      return;
    }
    let active = true;
    setState((current) => (current.status === "ready" ? current : { status: "loading" }));
    void loadShowcase(id)
      .then((showcase) => {
        if (!active) return;
        setState(showcase ? { status: "ready", showcase } : { status: "failed", message: "No showcase is registered for this entry." });
      })
      .catch((error: unknown) => {
        if (!active) return;
        setState({ status: "failed", message: error instanceof Error ? error.message : String(error) });
      });
    return () => {
      active = false;
    };
  }, [enabled, id, retryKey, retryNonce]);

  return {
    ...state,
    retry: () => setRetryKey((value) => value + 1),
  };
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
  const [retryNonce, setRetryNonce] = useState(0);
  const profile = profileOf(entry);
  // Seed demos are already part of the shell; do not pull any showcase group
  // (and its gsap/motion/three runtime) just to run one of them on hover.
  const SeedDemo = getDemo(entry.id);

  const kind = preferredPreviewKind(entry, {
    globalPaused: !motionOn,
    reducedMotion,
    visible,
    forceLive,
  });

  const showcaseState = useEntryShowcase(entry.id, kind === "live" && !SeedDemo, retryNonce);

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

  const showcase = showcaseState.status === "ready" ? showcaseState.showcase : undefined;
  const DemoComponent = showcase?.Component ?? SeedDemo ?? null;
  const loadFailed = showcaseState.status === "failed";
  const loadError = showcaseState.status === "failed" ? showcaseState.message : undefined;
  const interactive = (entry.behaviors ?? []).some((behavior) =>
    ["cursor-reactive", "hover", "gesture", "interactive-text", "interactive-nav", "stateful"].includes(behavior),
  );
  const retry = () => {
    setRetryNonce((value) => value + 1);
    showcaseState.retry();
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
            <button
              type="button"
              className="preview-regenerate"
              onClick={retry}
              title={loadError}
            >
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
