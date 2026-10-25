// Gallery card (M5.3; M7.1 minimal rewrite): exactly three visible elements —
// the preview, the component name, and a selection checkbox. All metadata
// (summary, source, category, aesthetics, dependencies, status) stays available
// in the preview workspace rail and the browser detail pane; the grid stays
// quiet so the previews carry the experience.
//
// Open action: local entries (the 71 runnable previews) get a stretched link
// over the whole card that opens the IN-APP preview workspace, so inspecting a
// card never navigates away from the catalog. External entries keep their
// honest, labeled off-site tile from PreviewBox (an in-app stage cannot exist
// for them) — that tile is the card's accessible preview action, and the source
// URL is the explicitly labeled official action. The checkbox is a sibling of
// the stretched link (never a child), so toggling selection can never trigger
// navigation.
import type { CatalogEntry } from "../../catalog/types";
import { PreviewBox, previewKind } from "./PreviewBox";

export interface GalleryCardProps {
  entry: CatalogEntry;
  selected?: boolean;
  onToggleSelect?: (id: string, next: boolean) => void;
}

export function GalleryCard({ entry, selected = false, onToggleSelect }: GalleryCardProps) {
  const kind = previewKind(entry);
  // Only entries with a runnable local stage get the stretched card link;
  // external tiles keep their own (honest, off-site) anchor unaffected.
  const cardOpensWorkspace = kind === "local-demo";

  return (
    <li
      className={`gallery-card ${selected ? "is-selected" : ""}`}
      data-entry-id={entry.id}
      data-preview-kind={kind}
    >
      <PreviewBox entry={entry} />
      {cardOpensWorkspace ? (
        <a
          className="gallery-card-overlay"
          href={`#/preview/${entry.id}`}
          aria-label={`Open ${entry.name} in the preview workspace`}
          data-testid="gallery-card-open"
        />
      ) : null}
      <h3 className="gallery-title">
        {cardOpensWorkspace ? (
          // The title is part of the card's single open action (inside the
          // stretched link region but kept as inert text for screen readers, so
          // the accessible name stays on the anchor itself).
          <span aria-hidden="true">{entry.name}</span>
        ) : (
          entry.name
        )}
      </h3>
      <label className="gallery-frame-select">
        <input
          type="checkbox"
          className="select-check"
          checked={selected}
          onChange={(event) => onToggleSelect?.(entry.id, event.target.checked)}
          aria-label={`Select ${entry.name} for the master prompt`}
        />
        <span className="select-check-mark" aria-hidden="true">
          ✓
        </span>
      </label>
    </li>
  );
}
