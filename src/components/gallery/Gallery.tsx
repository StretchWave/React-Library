// Adaptive browse wall. The grid receives pre-filtered entries and owns only
// presentation + bulk actions; filters, routing and personal data live in App.
import { useId, useSyncExternalStore } from "react";
import type { CatalogEntry } from "../../catalog/types";
import { isMotionPlaying, setMotionPlaying, subscribeMotion } from "../../lib/motion";
import { GalleryCard } from "./GalleryCard";
import { HoverPreview } from "./HoverPreview";
import { SelectionTray } from "./SelectionTray";
import { useHoverPreviewController } from "./useHoverPreviewController";

export interface GalleryProps {
  entries: CatalogEntry[];
  totalCount: number;
  filtersActive: boolean;
  onResetFilters: () => void;
  selectedIds: string[];
  selectionItems: CatalogEntry[];
  favoriteIds: string[];
  onToggleSelect: (id: string, next: boolean) => void;
  onToggleFavorite: (id: string) => void;
  onOpenEntry: (id: string) => void;
  onExpandEntry: (id: string) => void;
  onSelectAllVisible: () => void;
  onRemoveSelection: (id: string) => void;
  onMoveSelection: (id: string, delta: -1 | 1) => void;
  onClearSelection: () => void;
  onGeneratePrompt: () => void;
  onCompare: () => void;
}

export function Gallery({
  entries,
  totalCount,
  filtersActive,
  onResetFilters,
  selectedIds,
  selectionItems,
  favoriteIds,
  onToggleSelect,
  onToggleFavorite,
  onOpenEntry,
  onExpandEntry,
  onSelectAllVisible,
  onRemoveSelection,
  onMoveSelection,
  onClearSelection,
  onGeneratePrompt,
  onCompare,
}: GalleryProps) {
  const selectedSet = new Set(selectedIds);
  const favorites = new Set(favoriteIds);
  const motionOn = useSyncExternalStore(subscribeMotion, isMotionPlaying);
  const sourceCount = new Set(entries.map((entry) => entry.source).filter(Boolean)).size;
  const preview = useHoverPreviewController();
  const previewPanelId = useId();

  return (
    <section className="gallery-view" aria-label="Browse components">
      <div className="gallery-toolbar">
        <p className="result-count" role="status">
          {filtersActive ? `${entries.length} of ${totalCount} components` : `${totalCount} components`}
          {sourceCount > 0 ? ` \u00b7 ${sourceCount} source libraries` : ""}
        </p>
        <div className="gallery-bulk-actions">
          <button
            type="button"
            className="gallery-motion-toggle"
            aria-pressed={!motionOn}
            onClick={() => setMotionPlaying(!motionOn)}
          >
            {motionOn ? "Pause previews" : "Resume previews"}
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
          <button
            type="button"
            className="gallery-compare"
            onClick={onCompare}
            disabled={selectionItems.length < 2}
          >
            Compare selected
          </button>
        </div>
      </div>
      {entries.length === 0 ? (
        <div className="list-empty gallery-empty">
          <p>No components match these filters.</p>
          <button type="button" className="reset-filters" onClick={onResetFilters}>
            Clear all filters
          </button>
        </div>
      ) : (
        <ul className="gallery-grid" aria-label="Component gallery cards">
          {entries.map((entry) => (
            <GalleryCard
              key={entry.id}
              entry={entry}
              selected={selectedSet.has(entry.id)}
              favorite={favorites.has(entry.id)}
              onToggleSelect={onToggleSelect}
              onToggleFavorite={onToggleFavorite}
              onOpen={(id) => {
                preview.dismiss();
                onOpenEntry(id);
              }}
              onExpand={(id) => {
                preview.dismiss();
                onExpandEntry(id);
              }}
              previewActive={preview.state?.entry.id === entry.id}
              previewPanelId={previewPanelId}
              onPreviewEnter={preview.notifyEnter}
              onPreviewLeave={preview.notifyLeave}
              onTogglePreview={preview.togglePinned}
            />
          ))}
        </ul>
      )}
      {preview.state ? (
        <HoverPreview
          entry={preview.state.entry}
          anchor={preview.state.anchor}
          id={previewPanelId}
          panelRef={preview.panelRef}
          phase={preview.state.phase}
          pinned={preview.state.pinned}
          onDismiss={preview.dismiss}
          onPanelEnter={preview.notifyPanelEnter}
          onPanelLeave={preview.notifyPanelLeave}
          onExpand={(id) => {
            preview.dismiss();
            onExpandEntry(id);
          }}
        />
      ) : null}
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
