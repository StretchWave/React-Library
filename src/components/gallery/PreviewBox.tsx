// Honest preview renderer (M5.3, extended M6.4 with lazy mini stages).
// Policy: never execute ingested third-party code inside the main application
// context. Live previews render only through reviewed wrappers:
//   - vendored react-bits entries  → src/catalog/showcases registry (MiniStage)
//   - seeded in-app components     → the vetted demo registry (MiniStage wraps
//                                    the same demo used by the detail pane)
// Every other entry renders a labeled, data-driven link or note:
//   - "external"     → official hosted preview (verified URL from the record)
//   - "source-link"  → clear fallback to the official source page
//   - "static"       → permitted static resource (verified URL from the record)
//   - "none"         → an explicit honest note from the record
//
// MiniStage playback policy (M6.4): stages auto-play only when the card is in
// the viewport AND the global motion preference is playing; a manual Play
// button covers environments without IntersectionObserver (and honors users
// who start playback deliberately). Heavy entries never auto-play — their
// safe, full-fidelity home is the preview workspace.
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { ComponentType } from "react";
import { getDemo } from "../../catalog/demos";
import { entryTypeOf, type CatalogEntry, type PreviewType } from "../../catalog/types";
import { getShowcase, type ShowcaseValues } from "../../catalog/showcases";
import { isMotionPlaying, subscribeMotion } from "../../lib/motion";

export type PreviewKind = PreviewType;

/** Resolves the preview kind actually rendered for an entry. Entries without a
 *  recorded preview fall back to a source link when an official sourceUrl
 *  exists; otherwise they are "none". */
export function previewKind(entry: CatalogEntry): PreviewKind {
  if (entryTypeOf(entry) === "local" && getDemo(entry.id)) return "local-demo";
  if (entry.preview) return entry.preview.type;
  if (entry.sourceUrl) return "source-link";
  return "none";
}

const LINK_CARD_COPY: Record<"external" | "source-link", string> = {
  external: "Open official preview",
  "source-link": "View at source",
};

interface MiniStageProps {
  entryId: string;
  name: string;
  Component: ComponentType<ShowcaseValues>;
  heavy: boolean;
}

function MiniStage({ entryId, name, Component, heavy }: MiniStageProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [autoVisible, setAutoVisible] = useState(false);
  const [manualPlay, setManualPlay] = useState(false);
  const motionOn = useSyncExternalStore(subscribeMotion, isMotionPlaying);

  // Re-observ(ed) on resume so a card sitting in the viewport while the user
  // re-enables playback becomes active again (IO fires once per observe).
  useEffect(() => {
    const host = hostRef.current;
    if (!host || typeof IntersectionObserver !== "function") return;
    const observer = new IntersectionObserver(
      (records) => {
        for (const record of records) {
          if (record.target === host) setAutoVisible(record.isIntersecting);
        }
      },
      { rootMargin: "100px" },
    );
    observer.observe(host);
    return () => observer.disconnect();
  }, [motionOn]);

  const active = !heavy && motionOn && (manualPlay || autoVisible);

  return (
    <div
      className="preview-frame"
      ref={hostRef}
      data-preview-kind="local-demo"
      data-played={active ? "true" : "false"}
      data-heavy={heavy ? "true" : "false"}
    >
      {heavy ? (
        <div className="preview-mini-placeholder">
          <a href={`#/preview/${entryId}`} className="preview-mini-open">
            Open in preview workspace ↗
          </a>
          <p className="preview-mini-note">Heavy preview — full fidelity lives in the workspace.</p>
        </div>
      ) : active ? (
        <div className="preview-mini-stage" aria-label={`Live mini preview of ${name}`}>
          <div className="preview-mini-scaler" aria-hidden="true">
            <Component />
          </div>
        </div>
      ) : motionOn ? (
        <button
          type="button"
          className="preview-mini-play"
          aria-label={`Play preview of ${name}`}
          onClick={() => setManualPlay(true)}
        >
          Play
        </button>
      ) : (
        <p className="preview-mini-note" aria-label={`Previews paused for ${name}`}>
          Previews are paused.
        </p>
      )}
    </div>
  );
}

export function PreviewBox({ entry }: { entry: CatalogEntry }) {
  const kind = previewKind(entry);

  if (kind === "local-demo") {
    const showcase = getShowcase(entry.id);
    const SeedDemo = getDemo(entry.id);
    const Component = showcase?.Component ?? SeedDemo;
    if (!Component) {
      return null;
    }
    return (
      <MiniStage
        entryId={entry.id}
        name={entry.name}
        Component={Component as ComponentType<ShowcaseValues>}
        heavy={Boolean(entry.heavy ?? showcase?.heavy)}
      />
    );
  }

  if (kind === "external" || kind === "source-link") {
    const url = entry.preview?.url ?? entry.sourceUrl;
    if (!url) {
      return (
        <div className="preview-frame is-empty" data-preview-kind="none">
          <p>Preview link missing from the record.</p>
        </div>
      );
    }
    return (
      <a
        className="preview-frame is-link"
        data-preview-kind={kind}
        href={url}
        target="_blank"
        rel="noreferrer noopener"
      >
        {LINK_CARD_COPY[kind]}
        <span className="preview-frame-hint">{new URL(url).hostname}</span>
      </a>
    );
  }

  if (kind === "static") {
    const url = entry.preview?.url ?? "";
    return (
      <a
        className="preview-frame is-static"
        data-preview-kind="static"
        href={url}
        target="_blank"
        rel="noreferrer noopener"
      >
        {url ? (
          <img src={url} alt={`${entry.name} static preview`} loading="lazy" />
        ) : (
          <p>Static preview missing from the record.</p>
        )}
      </a>
    );
  }

  const note = entry.preview?.note ?? "No preview is available for this entry yet.";
  return (
    <div className="preview-frame is-empty" data-preview-kind="none">
      <p>{note}</p>
    </div>
  );
}
