// Full-canvas preview overlay (M8.3). It stays mounted through its exit
// animation, traps focus while open, makes the app behind it inert, locks body
// scroll and restores both focus and scroll on close. The backdrop is dimmed
// and blurred, with a token-only fallback for browsers without
// backdrop-filter.
//
// The workspace itself is still lazy: the dialog shell paints immediately and
// the stage loads the selected showcase group only when it is needed.
import { lazy, Suspense, useEffect, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import type { CatalogEntry } from "../../catalog/types";
import { previewSummary, profileOf, previewStatusLabel, snapshotUrl } from "../../catalog/preview";
import { copyText } from "../../lib/clipboard";

const PreviewWorkspace = lazy(() =>
  import("./PreviewWorkspace").then((module) => ({ default: module.PreviewWorkspace })),
);

const EXIT_MS = 220;
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export interface ExpandedPreviewProps {
  /** Null starts (or continues) the exit animation. */
  entry: CatalogEntry | null;
  selected: boolean;
  onToggleSelection: (id: string, next: boolean) => void;
  onClose: () => void;
}

type Phase = "open" | "closing";

function focusablesIn(root: HTMLElement | null): HTMLElement[] {
  if (!root) return [];
  const all = [...root.querySelectorAll<HTMLElement>(FOCUSABLE)];
  // jsdom has no layout; keep the full list there so the trap is testable.
  const laidOut = all.filter((element) => element.getClientRects().length > 0);
  return laidOut.length > 0 ? laidOut : all;
}

export function ExpandedPreview({
  entry,
  selected,
  onToggleSelection,
  onClose,
}: ExpandedPreviewProps) {
  const [rendered, setRendered] = useState<CatalogEntry | null>(entry);
  const [phase, setPhase] = useState<Phase>(entry ? "open" : "closing");
  const layerRef = useRef<HTMLDivElement | null>(null);
  const dialogRef = useRef<HTMLElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const exitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep the last entry mounted for the closing animation; only unmount after
  // the transition (with a timer fallback independent of animation events).
  useEffect(() => {
    if (exitTimer.current !== null) {
      clearTimeout(exitTimer.current);
      exitTimer.current = null;
    }
    if (entry) {
      setRendered(entry);
      setPhase("open");
      return;
    }
    setPhase("closing");
    exitTimer.current = setTimeout(() => {
      exitTimer.current = null;
      setRendered(null);
    }, EXIT_MS);
    return () => {
      if (exitTimer.current !== null) {
        clearTimeout(exitTimer.current);
        exitTimer.current = null;
      }
    };
  }, [entry]);

  useEffect(() => () => {
    if (exitTimer.current !== null) clearTimeout(exitTimer.current);
  }, []);

  const mounted = Boolean(rendered);

  useEffect(() => {
    if (!mounted) return;
    const dialog = dialogRef.current;
    previousFocus.current = document.activeElement as HTMLElement | null;

    // Scroll lock: compensate the scrollbar so the gallery does not jump.
    const body = document.body;
    const previousOverflow = body.style.overflow;
    const previousPadding = body.style.paddingRight;
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    body.style.overflow = "hidden";
    if (scrollbar > 0) body.style.paddingRight = `${scrollbar}px`;

    // Background inertness. The portal is a direct child of body, so every
    // other top-level node becomes inert while the modal is open.
    const layer = layerRef.current;
    const inertTargets: Array<{ element: HTMLElement; had: boolean }> = [];
    for (const child of [...document.body.children]) {
      if (!(child instanceof HTMLElement)) continue;
      if (child === layer) continue;
      if (["SCRIPT", "STYLE", "LINK"].includes(child.tagName)) continue;
      inertTargets.push({ element: child, had: child.hasAttribute("inert") });
      child.setAttribute("inert", "");
    }

    const focusClose = () => {
      if (dialog?.contains(document.activeElement)) return;
      closeRef.current?.focus();
    };
    const raf = requestAnimationFrame(focusClose);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !dialog) return;
      const focusables = focusablesIn(dialog);
      if (focusables.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || !dialog.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("keydown", onKeyDown);
      body.style.overflow = previousOverflow;
      body.style.paddingRight = previousPadding;
      for (const { element, had } of inertTargets) {
        if (!had) element.removeAttribute("inert");
      }
      const restore = previousFocus.current;
      if (restore?.isConnected) restore.focus();
    };
    // Re-run only when the overlay mounts/unmounts, not for entry changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, onClose]);

  if (!rendered) return null;
  const profile = profileOf(rendered);

  return createPortal(
    <div
      ref={layerRef}
      className="expanded-backdrop"
      data-phase={phase}
      data-testid="expanded-backdrop"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        ref={dialogRef as RefObject<HTMLElement>}
        className="expanded-preview"
        role="dialog"
        aria-modal="true"
        aria-label={`Preview: ${rendered.name}`}
        aria-labelledby="expanded-preview-title"
        data-testid="expanded-preview"
        data-phase={phase}
        data-preview-status={profile.previewStatus}
        tabIndex={-1}
      >
        <header className="expanded-preview-head">
          <div>
            <p className="expanded-kicker">
              {previewStatusLabel(rendered)} {"\u00b7"} {profile.layout} layout {"\u00b7"} {profile.cost} cost
            </p>
            <h2 id="expanded-preview-title">{rendered.name}</h2>
            <p className="expanded-summary">{previewSummary(rendered)}</p>
          </div>
          <div className="expanded-actions">
            <button
              type="button"
              onClick={() =>
                void copyText(rendered.retrieval ?? `npm run lookup -- ${rendered.id} --json`)
              }
            >
              Copy retrieval
            </button>
            <button
              type="button"
              aria-pressed={selected}
              onClick={() => onToggleSelection(rendered.id, !selected)}
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
              {snapshotUrl(rendered) ? (
                <img src={snapshotUrl(rendered)} alt={`Captured state of ${rendered.name}`} />
              ) : null}
              {rendered.preview?.url || rendered.sourceUrl ? (
                <a href={rendered.preview?.url ?? rendered.sourceUrl} target="_blank" rel="noreferrer">
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
                entry={rendered}
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
