// Gallery view (M5.3): the full searchable card grid over the catalog.
// Receives pre-filtered entries from App (same filters as the browser view);
// every card is data-driven from the canonical record with an honest preview.
import type { CatalogEntry } from "../../catalog/types";
import { GalleryCard } from "./GalleryCard";

export interface GalleryProps {
  entries: CatalogEntry[];
  totalCount: number;
  filtersActive: boolean;
  onResetFilters: () => void;
  onOpenDetail: (id: string) => void;
}

export function Gallery({
  entries,
  totalCount,
  filtersActive,
  onResetFilters,
  onOpenDetail,
}: GalleryProps) {
  return (
    <section className="gallery-view" aria-label="Component gallery">
      <p className="result-count" role="status">
        {filtersActive
          ? `${entries.length} of ${totalCount} entries`
          : `${totalCount} entries · ${new Set(entries.map((entry) => entry.source).filter(Boolean)).size} source libraries`}
      </p>
      {entries.length === 0 ? (
        <div className="list-empty">
          <p>
            No entries match the current filters (0 of {totalCount}).
          </p>
          <button type="button" className="reset-filters" onClick={onResetFilters}>
            Reset filters
          </button>
        </div>
      ) : (
        <ul className="gallery-grid" aria-label="Component gallery cards">
          {entries.map((entry) => (
            <GalleryCard key={entry.id} entry={entry} onOpenDetail={onOpenDetail} />
          ))}
        </ul>
      )}
    </section>
  );
}
