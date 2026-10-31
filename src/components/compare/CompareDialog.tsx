// Side-by-side comparison for a handful of selected entries. Uses the real
// captured snapshots in a consistent canvas so expensive WebGL previews are
// compared fairly without mounting several runtimes at once.
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import type { CatalogEntry } from "../../catalog/types";
import { previewStatusLabel, profileOf, snapshotUrl } from "../../catalog/preview";

export interface CompareDialogProps {
  entries: CatalogEntry[];
  onClose: () => void;
  onOpenEntry: (id: string) => void;
}

export function CompareDialog({ entries, onClose, onOpenEntry }: CompareDialogProps) {
  const closeRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  return createPortal(
    <div className="compare-backdrop" role="presentation">
      <section className="compare-dialog" role="dialog" aria-modal="true" aria-labelledby="compare-title">
        <header className="compare-head">
          <div>
            <p className="expanded-kicker">Selection compare</p>
            <h2 id="compare-title">Compare {entries.length} components</h2>
            <p>Snapshots keep the comparison fair; open any card for its full interactive stage.</p>
          </div>
          <button ref={closeRef} type="button" className="expanded-close" onClick={onClose}>
            Close
          </button>
        </header>
        <div className="compare-grid">
          {entries.map((entry) => {
            const url = snapshotUrl(entry);
            const profile = profileOf(entry);
            return (
              <article key={entry.id} className="compare-card">
                <button type="button" className="compare-preview" onClick={() => onOpenEntry(entry.id)}>
                  {url ? (
                    <img src={url} alt={`Captured preview of ${entry.name}`} loading="lazy" />
                  ) : (
                    <span className="compare-fallback">{previewStatusLabel(entry)}</span>
                  )}
                </button>
                <div className="compare-body">
                  <h3>{entry.name}</h3>
                  <p>{entry.summary}</p>
                  <dl>
                    <div><dt>Type</dt><dd>{entry.types[0] ?? "component"}</dd></div>
                    <div><dt>Trigger</dt><dd>{entry.triggers[0] ?? "static"}</dd></div>
                    <div><dt>Preview</dt><dd>{previewStatusLabel(entry)}</dd></div>
                    <div><dt>Cost</dt><dd>{profile.cost}</dd></div>
                  </dl>
                  <button type="button" onClick={() => onOpenEntry(entry.id)}>
                    Open preview
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>,
    document.body,
  );
}
