// Selection tray (M5.4): reviews everything currently selected in one place,
// regardless of the gallery filters, with per-item type/status and honest
// availability flags raised BEFORE the user generates the master prompt.
import type { CatalogEntry } from "../../catalog/types";
import { entryTypeOf } from "../../catalog/types";
import { statusChipClass } from "../browser/statusChip";

export interface SelectionTrayProps {
  items: CatalogEntry[];
  onRemove: (id: string) => void;
  onMove: (id: string, delta: -1 | 1) => void;
  onClear: () => void;
  onGenerate: () => void;
  generateVisible: boolean;
}

/** Honest readiness flags computed from the canonical record. For external
 *  entries the record guarantees retrieval instructions; for local entries the
 *  validator guarantees declared local files exist — beyond that we flag any
 *  gap an agent would hit (missing local paths, unavailable preview). */
export function availabilityNotes(entry: CatalogEntry): string[] {
  const notes: string[] = [];
  if (entry.preview?.type === "none") {
    notes.push(`preview unavailable (${entry.preview.note})`);
  }
  if (entryTypeOf(entry) === "local") {
    if (!entry.manifest && !entry.links?.source && !(entry.implementation ?? []).length) {
      notes.push("no local extension point recorded (manifest/implementation/source link)");
    }
  } else if (!entry.retrieval) {
    notes.push("missing official retrieval instructions");
  }
  return notes;
}

export function SelectionTray({
  items,
  onRemove,
  onMove,
  onClear,
  onGenerate,
  generateVisible,
}: SelectionTrayProps) {
  return (
    <section
      className="selection-tray"
      data-testid="selection-tray"
      aria-label="Selected components"
    >
      <div className="tray-head">
        <h2 className="tray-title">
          Selected components
          <span className="tray-count" data-testid="tray-count">
            {items.length}
          </span>
        </h2>
        <button
          type="button"
          className="tray-clear"
          onClick={onClear}
          disabled={items.length === 0}
        >
          Clear all
        </button>
      </div>
      {items.length === 0 ? (
        <p className="tray-empty">
          Nothing selected yet — tick the checkbox on any gallery card or in the
          detail view. The selection survives filtering, sorting, and reloads.
        </p>
      ) : (
        <ul className="tray-list">
          {items.map((entry, index) => (
            <li key={entry.id} className="tray-item">
              <span className="tray-order" aria-hidden="true">
                {index + 1}.
              </span>
              <span className="tray-name">{entry.name}</span>
              <span className={`status-chip ${statusChipClass(entry)}`}>{entry.status}</span>
              <span className="type-chip" data-type={entryTypeOf(entry)}>
                {entryTypeOf(entry)}
              </span>
              <div className="tray-controls">
                <button
                  type="button"
                  className="tray-move"
                  aria-label={`Move ${entry.name} earlier in the selection`}
                  onClick={() => onMove(entry.id, -1)}
                  disabled={index === 0}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="tray-move"
                  aria-label={`Move ${entry.name} later in the selection`}
                  onClick={() => onMove(entry.id, 1)}
                  disabled={index === items.length - 1}
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="tray-remove"
                  aria-label={`Remove ${entry.name} from the selection`}
                  onClick={() => onRemove(entry.id)}
                >
                  Remove
                </button>
              </div>
              {availabilityNotes(entry).length > 0 ? (
                <ul className="tray-warnings" aria-label={`${entry.name} availability notes`}>
                  {availabilityNotes(entry).map((note) => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      {generateVisible ? (
        <div className="tray-actions">
          <button
            type="button"
            className="tray-generate"
            onClick={onGenerate}
            disabled={items.length === 0}
          >
            Generate master prompt
          </button>
        </div>
      ) : null}
    </section>
  );
}
