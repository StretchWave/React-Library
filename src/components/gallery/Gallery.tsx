// Gallery view (M5.3 + M5.4 + M6.4): the full searchable card grid over the
// catalog, selection controls, the selection tray, and the global preview
// motion toggle. Receives pre-filtered entries plus the app-level selection
// state; every card is data-driven from the canonical record with an honest
// preview.
import { useSyncExternalStore } from "react";
import type { CatalogEntry } from "../../catalog/types";
import { isMotionPlaying, setMotionPlaying, subscribeMotion } from "../../lib/motion";
import { GalleryCard } from "./GalleryCard";
import { SelectionTray } from "./SelectionTray";

export interface GalleryProps {
  entries: CatalogEntry[];
  totalCount: number;
  filtersActive: boolean;
  onResetFilters: () => void;
  onOpenDetail: (id: string) => void;
  /** M5.4 selection state (stable ids, order preserved). */
  selectedIds: string[];
  selectionItems: CatalogEntry[];
  onToggleSelect: (id: string, next: boolean) => void;
  onSelectAllVisible: () => void;
  onRemoveSelection: (id: string) => void;
  onMoveSelection: (id: string, delta: -1 | 1) => void;
  onClearSelection: () => void;
  onGeneratePrompt: () => void;
}

export function Gallery({
  entries,
  totalCount,
  filtersActive,
  onResetFilters,
  onOpenDetail,
  selectedIds,
  selectionItems,
  onToggleSelect,
  onSelectAllVisible,
  onRemoveSelection,
  onMoveSelection,
  onClearSelection,
  onGeneratePrompt,
}: GalleryProps) {
  const selectedSet = new Set(selectedIds);
  const motionOn = useSyncExternalStore(subscribeMotion, isMotionPlaying);
  return (
    <section className="gallery-view" aria-label="Component gallery">
      <div className="gallery-toolbar">
        <p className="result-count" role="status">
          {filtersActive
            ? `${entries.length} of ${totalCount} entries`
            : `${totalCount} entries · ${new Set(entries.map((entry) => entry.source).filter(Boolean)).size} source libraries`}
        </p>
        <div className="gallery-bulk-actions">
          <button
            type="button"
            className="gallery-motion-toggle"
            aria-pressed={!motionOn}
            onClick={() => setMotionPlaying(!motionOn)}
          >
            {motionOn ? "Pause previews" : "Play previews"}
          </button>
          <button
            type="button"
            className="gallery-bulk-select"
            aria-label="Select all visible results"
            onClick={onSelectAllVisible}
            disabled={entries.length === 0}
          >
            Select all visible
          </button>
        </div>
      </div>
      {entries.length === 0 ? (
        <div className="list-empty">
          <p>No entries match the current filters (0 of {totalCount}).</p>
          <button type="button" className="reset-filters" onClick={onResetFilters}>
            Reset filters
          </button>
        </div>
      ) : (
        <ul className="gallery-grid" aria-label="Component gallery cards">
          {entries.map((entry) => (
            <GalleryCard
              key={entry.id}
              entry={entry}
              onOpenDetail={onOpenDetail}
              selected={selectedSet.has(entry.id)}
              onToggleSelect={onToggleSelect}
            />
          ))}
        </ul>
      )}
      <SelectionTray
        items={selectionItems}
        onRemove={onRemoveSelection}
        onMove={onMoveSelection}
        onClear={onClearSelection}
        onGenerate={onGeneratePrompt}
        generateVisible
      />
    </section>
  );
}
