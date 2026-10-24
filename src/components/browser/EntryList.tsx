// Entry list for the component browser (M2). Pure rendering of pre-filtered
// entries; filtering lives in src/lib/search.ts; selection state lives in App.
import type { CatalogEntry } from "../../catalog/types";
import { statusChipClass } from "./statusChip";

export interface EntryListProps {
  entries: CatalogEntry[];
  totalCount: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
  filtersActive: boolean;
  onResetFilters: () => void;
}

export function EntryList({
  entries,
  totalCount,
  selectedId,
  onSelect,
  filtersActive,
  onResetFilters,
}: EntryListProps) {
  if (entries.length === 0 && filtersActive) {
    return (
      <div className="list-empty">
        <p>
          No components match the current filters (
          <span data-testid="matched-count">0</span> of {totalCount}).
        </p>
        <button type="button" className="reset-filters" onClick={onResetFilters}>
          Reset filters
        </button>
      </div>
    );
  }

  return (
    <>
      <p className="result-count" role="status">
        {filtersActive
          ? `${entries.length} of ${totalCount} components`
          : `${totalCount} components`}
      </p>
      <ul className="entry-list">
        {entries.map((entry) => (
          <li key={entry.id}>
            <button
              type="button"
              className={
                selectedId === entry.id ? "entry-item is-selected" : "entry-item"
              }
              aria-current={selectedId === entry.id ? "true" : undefined}
              onClick={() => onSelect(entry.id)}
            >
              <span className="entry-label">{entry.name}</span>
              {" "}
              <span className={`status-chip ${statusChipClass(entry)}`}>
                {entry.status}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}
