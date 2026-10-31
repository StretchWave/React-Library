// Full-canvas preview overlay. It lazily loads the existing preview workspace
// (and therefore the showcase/animation chunk) only when a user expands a
// card. The browse route, filters and scroll stay mounted underneath.
import { lazy, Suspense, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import type { CatalogEntry } from "../../catalog/types";
import { previewSummary, profileOf, previewStatusLabel, snapshotUrl } from "../../catalog/preview";
import { copyText } from "../../lib/clipboard";

const PreviewWorkspace = lazy(() =>
  import("./PreviewWorkspace").then((module) => ({ default: module.PreviewWorkspace })),
);

export interface ExpandedPreviewProps {
  entry: CatalogEntry;
  selected: boolean;
  onToggleSelection: (id: string, next: boolean) => void;
  onClose: () => void;
}

export function ExpandedPreview({ entry, selected, onToggleSelection, onClose }: ExpandedPreviewProps) {
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const profile = profileOf(entry);

  useEffect(() => {
    previousFocus.current = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus.current?.focus?.();
    };
  }, [onClose]);

  return createPortal(
    <div className="expanded-backdrop" role="presentation">
      <section
        className="expanded-preview"
        role="dialog"
        aria-modal="true"
        aria-label={`Preview: ${entry.name}`}
        aria-labelledby="expanded-preview-title"
        data-testid="expanded-preview"
        data-preview-status={profile.previewStatus}
      >
        <header className="expanded-preview-head">
          <div>
            <p className="expanded-kicker">
              {previewStatusLabel(entry)} {"\u00b7"} {profile.layout} layout {"\u00b7"} {profile.cost} cost
            </p>
            <h2 id="expanded-preview-title">{entry.name}</h2>
            <p className="expanded-summary">{previewSummary(entry)}</p>
          </div>
          <div className="expanded-actions">
            <button
              type="button"
              onClick={() => void copyText(entry.retrieval ?? `npm run lookup -- ${entry.id} --json`)}
            >
              Copy retrieval
            </button>
            <button
              type="button"
              aria-pressed={selected}
              onClick={() => onToggleSelection(entry.id, !selected)}
            >
              {selected ? "Selected" : "Select for prompt"}
            </button>
            <button ref={closeRef} type="button" className="expanded-close" onClick={onClose}>
              Close
            </button>
          </div>
        </header>
        <div className="expanded-preview-body">
          {profile.mode === "external" ? (
            <div className="expanded-external" data-testid="preview-honest">
              <span className="expanded-external-mark" aria-hidden="true">
                {"\u2197"}
              </span>
              <h3>External reference</h3>
              <p>{profile.failureReason ?? "This component is not run locally. Use the official link."}</p>
              {snapshotUrl(entry) ? <img src={snapshotUrl(entry)} alt={`Captured state of ${entry.name}`} /> : null}
              {entry.preview?.url || entry.sourceUrl ? (
                <a href={entry.preview?.url ?? entry.sourceUrl} target="_blank" rel="noreferrer">
                  Open official preview
                </a>
              ) : null}
            </div>
          ) : profile.previewStatus === "unavailable" ? (
            <div className="expanded-external" data-testid="preview-honest">
              <h3>No verified preview</h3>
              <p>{profile.failureReason ?? "No runnable preview or captured fallback is available."}</p>
            </div>
          ) : (
            <Suspense fallback={<div className="expanded-loading">Loading full preview...</div>}>
              <PreviewWorkspace
                entry={entry}
                selected={selected}
                onToggleSelection={onToggleSelection}
              />
            </Suspense>
          )}
        </div>
      </section>
    </div>,
    document.body,
  );
}
