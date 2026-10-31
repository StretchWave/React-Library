// Enlarged preview panel. Gallery owns the lifetime through
// useHoverPreviewController; this component is presentational plus local
// dismissal listeners. It stays mounted during the closing animation and is
// removed by the controller when that animation has finished.
//
// Hover mode opens automatically and closes when the pointer leaves both the
// card and the panel. Pinned mode (keyboard/touch control) ignores pointer
// movement, moves focus into the panel and returns it to the trigger later.
import { useEffect, type RefObject } from "react";
import { createPortal } from "react-dom";
import { hasUsablePreview, profileOf } from "../../catalog/preview";
import type { CatalogEntry } from "../../catalog/types";
import type { HoverPreviewPhase } from "./useHoverPreviewController";
import { PreviewBox } from "./PreviewBox";

export interface HoverPreviewProps {
  entry: CatalogEntry;
  anchor: DOMRect;
  /** Stable id so the card's trigger can expose aria-controls. */
  id: string;
  panelRef: RefObject<HTMLElement | null>;
  phase: HoverPreviewPhase;
  pinned: boolean;
  onDismiss: () => void;
  onPanelEnter: () => void;
  onPanelLeave: () => void;
  /** Heavy entries: explicit route to the full workspace. */
  onExpand?: (id: string) => void;
}

const MARGIN = 16;
const GAP = 14;

/** Prefers a side of the card so the hovered preview stays visible, then
 *  falls back to opening above or below it. */
export function hoverPanelRect(
  anchor: DOMRect,
  viewport: { width: number; height: number },
): { left: number; top: number; width: number; height: number } | null {
  if (viewport.width < 900 || viewport.height < 600) return null;
  const width = Math.min(700, viewport.width - MARGIN * 2);
  const height = Math.min(470, viewport.height - MARGIN * 2);
  const clampTop = (value: number) =>
    Math.min(Math.max(MARGIN, value), viewport.height - height - MARGIN);

  const right = anchor.right + GAP;
  const leftSide = anchor.left - width - GAP;
  if (right + width <= viewport.width - MARGIN) {
    return { left: right, top: clampTop(anchor.top), width, height };
  }
  if (leftSide >= MARGIN) {
    return { left: leftSide, top: clampTop(anchor.top), width, height };
  }

  const left = Math.min(
    Math.max(MARGIN, anchor.left + anchor.width / 2 - width / 2),
    viewport.width - width - MARGIN,
  );
  const below = anchor.bottom + GAP;
  const above = anchor.top - height - GAP;
  let top: number;
  if (below + height <= viewport.height - MARGIN) top = below;
  else if (above >= MARGIN) top = above;
  else top = clampTop(below);
  return { left, top, width, height };
}

export function HoverPreview({
  entry,
  anchor,
  id,
  panelRef,
  phase,
  pinned,
  onDismiss,
  onPanelEnter,
  onPanelLeave,
  onExpand,
}: HoverPreviewProps) {
  const profile = profileOf(entry);
  const rect =
    typeof window === "undefined"
      ? null
      : hoverPanelRect(anchor, { width: window.innerWidth, height: window.innerHeight });

  useEffect(() => {
    if (!rect) return;
    const isInside = (target: EventTarget | null) => {
      if (!(target instanceof Node)) return false;
      if (panelRef.current?.contains(target)) return true;
      return (
        target instanceof Element &&
        target.closest("li[data-entry-id]")?.getAttribute("data-entry-id") === entry.id
      );
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onDismiss();
    };
    const onScroll = (event: Event) => {
      const target = event.target;
      if (target instanceof Node && panelRef.current?.contains(target)) return;
      onDismiss();
    };
    const onDocumentClick = (event: MouseEvent) => {
      if (isInside(event.target)) return;
      onDismiss();
    };
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onDismiss);
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("click", onDocumentClick, true);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onDismiss);
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("click", onDocumentClick, true);
    };
  }, [entry.id, onDismiss, panelRef, rect]);

  // An explicit open is a keyboard/touch interaction: move focus to the panel
  // region so the demo (and the close button) are reachable without a pointer.
  useEffect(() => {
    if (pinned && phase === "open") panelRef.current?.focus();
  }, [panelRef, phase, pinned]);

  if (!rect) return null;
  if (profile.mode === "external" || profile.previewStatus === "unavailable") return null;
  if (!hasUsablePreview(entry)) return null;

  const heavy = profile.cost === "high" || Boolean(entry.heavy);

  return createPortal(
    <aside
      ref={panelRef}
      id={id}
      className="hover-preview"
      role="region"
      aria-label={`Enlarged preview of ${entry.name}`}
      aria-hidden={phase === "closing" ? "true" : undefined}
      tabIndex={-1}
      data-testid="hover-preview"
      data-phase={phase}
      data-pinned={pinned ? "true" : undefined}
      data-heavy={heavy ? "true" : undefined}
      style={{ left: rect.left, top: rect.top, width: rect.width, height: rect.height }}
      onPointerEnter={pinned ? undefined : onPanelEnter}
      onPointerLeave={pinned ? undefined : onPanelLeave}
    >
      <button
        type="button"
        className="hover-preview-close"
        onClick={onDismiss}
        aria-label="Close enlarged preview"
        tabIndex={phase === "closing" ? -1 : undefined}
      >
        <span aria-hidden="true">×</span>
      </button>
      <div className="hover-preview-canvas">
        <PreviewBox entry={entry} forceLive />
      </div>
      {heavy && onExpand ? (
        <div className="hover-preview-heavy">
          <p>
            <strong>Heavy preview.</strong> The gallery keeps it on a real captured snapshot.
          </p>
          <button
            type="button"
            className="hover-preview-open"
            onClick={() => {
              onDismiss();
              onExpand(entry.id);
            }}
          >
            Open full preview
          </button>
        </div>
      ) : null}
    </aside>,
    document.body,
  );
}
