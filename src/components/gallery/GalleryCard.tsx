// Gallery card (M5.3; M7.1 minimal rewrite; M7.2 routing fix): exactly three
// visible elements — the preview, the component name, and a selection
// checkbox. All metadata (summary, source, category, aesthetics, dependencies,
// status) stays available in the preview workspace rail and the browser detail
// pane; the grid stays quiet so the previews carry the experience.
//
// Open action (M7.2): EVERY card's primary action is now the in-app preview
// route #/preview/<id> — live local previews, heavy WebGL posters, external
// references, static images, and entries with no runnable preview alike. A
// stretched link covers the whole card so clicking anywhere opens the preview
// workspace; the workspace (not the gallery card) owns the official-source
// link for external entries, so clicking a card never navigates off-site and
// never pretends a remote page is running locally. The checkbox is a sibling
// of the stretched link (never a child), so toggling selection can never
// trigger navigation.
//
// Interactive stages (M7.2): cards with a live, interactive-capable stage
// (hover/cursor-reactive/text/stateful behaviors) let the pointer reach the
// stage — the overlay link then retracts to the title strip via CSS (:has
// selectors in gallery.css) so hover demos work while the card click stays
// available in its lower region. Every card keeps a keyboard-reachable open
// link regardless of kind.
import type { CatalogEntry } from "../../catalog/types";
import { PreviewBox, previewKind } from "./PreviewBox";

export interface GalleryCardProps {
  entry: CatalogEntry;
  selected?: boolean;
  onToggleSelect?: (id: string, next: boolean) => void;
}

export function GalleryCard({ entry, selected = false, onToggleSelect }: GalleryCardProps) {
  const kind = previewKind(entry);

  return (
    <li
      className={`gallery-card ${selected ? "is-selected" : ""}`}
      data-entry-id={entry.id}
      data-preview-kind={kind}
    >
      <PreviewBox entry={entry} />
      <a
        className="gallery-card-overlay"
        href={`#/preview/${entry.id}`}
        aria-label={`Open ${entry.name} in the preview workspace`}
        data-testid="gallery-card-open"
      />
      <h3 className="gallery-title">
        {/* The title is part of the card's single open action (inside the
        stretched link region but kept as inert text for screen readers, so
        the accessible name stays on the anchor itself). */}
        <span aria-hidden="true">{entry.name}</span>
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
