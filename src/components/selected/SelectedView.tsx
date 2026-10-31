// Selected-for-AI workspace: the reviewed selection order, comparison and the
// master prompt builder in one view. Personal tags/notes are injected into the
// prompt without being written back to the catalog.
import type { CatalogEntry } from "../../catalog/types";
import { previewStatusLabel, profileOf, snapshotUrl } from "../../catalog/preview";
import type { AnnotationMap } from "../../lib/personal";
import { PromptStudio } from "../prompt/PromptStudio";
import { availabilityNotes } from "../gallery/SelectionTray";

export interface SelectedViewProps {
  items: CatalogEntry[];
  annotations: AnnotationMap;
  onBack: () => void;
  onOpenEntry: (id: string) => void;
  onExpandEntry: (id: string) => void;
  onRemove: (id: string) => void;
  onMove: (id: string, delta: -1 | 1) => void;
  onClear: () => void;
  onCompare: () => void;
}

export function SelectedView({
  items,
  annotations,
  onBack,
  onOpenEntry,
  onExpandEntry,
  onRemove,
  onMove,
  onClear,
  onCompare,
}: SelectedViewProps) {
  return (
    <section className="selected-view" aria-labelledby="selected-title">
      <header className="view-heading selected-heading">
        <div>
          <p className="view-kicker">Agent handoff</p>
          <h1 id="selected-title">Selected for AI</h1>
          <p>
            Review order and preview limitations before copying the prompt. Manual tags and notes are
            included; canonical catalog records remain untouched.
          </p>
        </div>
        <div className="selected-actions">
          <button type="button" onClick={onCompare} disabled={items.length < 2}>
            Compare
          </button>
          <button type="button" onClick={onClear} disabled={items.length === 0}>
            Clear selection
          </button>
        </div>
      </header>

      <div className="selected-layout">
        <section className="selected-list-panel" aria-labelledby="selected-list-title">
          <div className="selected-list-head">
            <h2 id="selected-list-title">Selection order</h2>
            <span>{items.length}</span>
          </div>
          {items.length === 0 ? (
            <div className="view-empty">
              <p>No components selected. Browse the wall and tick a card checkbox.</p>
              <button type="button" onClick={onBack}>
                Return to gallery
              </button>
            </div>
          ) : (
            <ol className="selected-list">
              {items.map((entry, index) => {
                const notes = availabilityNotes(entry);
                const profile = profileOf(entry);
                return (
                  <li key={entry.id} className="selected-item">
                    <span className="selected-order" aria-hidden="true">
                      {index + 1}
                    </span>
                    <button
                      type="button"
                      className="selected-thumb"
                      onClick={() => onOpenEntry(entry.id)}
                      aria-label={`Open details for ${entry.name}`}
                    >
                      {snapshotUrl(entry) ? (
                        <img src={snapshotUrl(entry)} alt="" loading="lazy" />
                      ) : (
                        <span>{entry.name.slice(0, 1)}</span>
                      )}
                    </button>
                    <div className="selected-item-main">
                      <button type="button" className="selected-item-name" onClick={() => onOpenEntry(entry.id)}>
                        {entry.name}
                      </button>
                      <span className="selected-item-meta">
                        {entry.types[0] ?? "component"} {"\u00b7"} {entry.triggers[0] ?? "static"} {"\u00b7"}{" "}
                        {previewStatusLabel(entry)} / {profile.cost}
                      </span>
                      {notes.length > 0 ? (
                        <ul className="selected-notes">
                          {notes.map((note) => (
                            <li key={note}>{note}</li>
                          ))}
                        </ul>
                      ) : null}
                      {annotations[entry.id]?.manualTags.length ? (
                        <span className="selected-manual-tags">
                          Manual: {annotations[entry.id].manualTags.join(", ")}
                        </span>
                      ) : null}
                    </div>
                    <div className="selected-item-actions">
                      <button type="button" onClick={() => onExpandEntry(entry.id)}>
                        Expand
                      </button>
                      <button
                        type="button"
                        onClick={() => onMove(entry.id, -1)}
                        disabled={index === 0}
                        aria-label={`Move ${entry.name} earlier`}
                      >
                        Up
                      </button>
                      <button
                        type="button"
                        onClick={() => onMove(entry.id, 1)}
                        disabled={index === items.length - 1}
                        aria-label={`Move ${entry.name} later`}
                      >
                        Down
                      </button>
                      <button type="button" onClick={() => onRemove(entry.id)} aria-label={`Remove ${entry.name}`}>
                        Remove
                      </button>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </section>
        <PromptStudio
          items={items}
          onBack={() => {
            document
              .querySelector(".selected-list-panel")
              ?.scrollIntoView?.({ behavior: "smooth", block: "start" });
          }}
          annotations={annotations}
        />
      </div>
    </section>
  );
}
