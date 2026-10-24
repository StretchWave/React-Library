// Honest preview renderer (M5.3, MASTER_SPEC §6). Policy: never execute
// ingested third-party code inside the main application context. Local-demo
// previews come only from the vetted demo registry (src/catalog/demos.ts);
// every other entry renders a labeled, data-driven link or note:
//   - "external"     → official hosted preview (verified URL from the record)
//   - "source-link"  → clear fallback to the official source page
//   - "static"       → permitted static resource (verified URL from the record)
//   - "none"         → an explicit honest note from the record
import { getDemo } from "../../catalog/demos";
import { entryTypeOf, type CatalogEntry, type PreviewType } from "../../catalog/types";

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

export function PreviewBox({ entry }: { entry: CatalogEntry }) {
  const kind = previewKind(entry);

  if (kind === "local-demo") {
    const Demo = getDemo(entry.id);
    if (!Demo) {
      return null;
    }
    return (
      <div className="preview-frame" data-preview-kind="local-demo">
        {/* Decorative inside cards: the accessible name lives on the card's
            Details button; the real interactive preview is in the detail pane. */}
        <div className="preview-demo-scale" aria-hidden="true">
          <Demo />
        </div>
      </div>
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
