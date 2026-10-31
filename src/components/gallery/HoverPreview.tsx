// Enlarged preview. A single low/medium-cost local entry runs at its native
// scale in a fixed panel near the card, so small UI demos stay legible and
// interactive without opening the full workspace. Pointer users open it by
// hovering (moving into the panel keeps it open); keyboard and touch users use
// the card's enlarged-preview control, which pins the panel and moves focus
// into it. Leaving both surfaces, scrolling the page, pressing Escape,
// clicking outside, or the close button dismisses it.
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { hasUsablePreview, profileOf } from "../../catalog/preview";
import type { CatalogEntry } from "../../catalog/types";
import { suppressHoverPreview } from "./hoverPreviewGuard";
import { PreviewBox } from "./PreviewBox";

export interface HoverPreviewProps {
  entry: CatalogEntry;
  anchor: DOMRect;
  /** Stable id so the card's trigger can expose aria-controls. */
  id: string;
  onClose: () => void;
  /** Pointer entered the card or panel: cancel any pending dismissal. */
  onKeepOpen: () => void;
  /** Pointer left both surfaces: dismiss shortly unless it returns. */
  onScheduleClose: () => void;
  /** Opened explicitly (keyboard/touch): keep it open across pointer moves and
   *  move focus into the panel until it is dismissed. */
  pinned?: boolean;
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
  onClose,
  onKeepOpen,
  onScheduleClose,
  pinned = false,
}: HoverPreviewProps) {
  const panelRef = useRef<HTMLElement | null>(null);
  const profile = profileOf(entry);
  const rect =
    typeof window === "undefined"
      ? null
      : hoverPanelRect(anchor, { width: window.innerWidth, height: window.innerHeight });

  useEffect(() => {
    if (!rect) return;
    const close = () => {
      suppressHoverPreview();
      onClose();
    };
    const isInside = (target: EventTarget | null) => {
      if (!(target instanceof Node)) return false;
      if (panelRef.current?.contains(target)) return true;
      return (
        target instanceof Element &&
        target.closest("li[data-entry-id]")?.getAttribute("data-entry-id") === entry.id
      );
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    // Mouseleave can be missed when the page re-renders or the pointer leaves
    // the window; use the actual pointer target as the source of truth.
    const onPointerMove = (event: PointerEvent) => {
      if (pinned) return;
      if (isInside(event.target)) onKeepOpen();
      else onScheduleClose();
    };
    const onScroll = (event: Event) => {
      const target = event.target;
      if (target instanceof Node && panelRef.current?.contains(target)) return;
      close();
    };
    const onDocumentClick = (event: MouseEvent) => {
      if (isInside(event.target)) return;
      close();
    };
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", close);
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointermove", onPointerMove, { passive: true });
    document.addEventListener("click", onDocumentClick, true);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", close);
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("click", onDocumentClick, true);
    };
  }, [anchor, entry.id, onClose, onKeepOpen, onScheduleClose, pinned]);

  // An explicit open is a keyboard/touch interaction: move focus to the panel
  // region so the demo (and the close button) are reachable without a pointer.
  useEffect(() => {
    if (pinned) panelRef.current?.focus();
  }, [pinned]);

  if (!rect) return null;
  if (profile.mode === "external" || profile.previewStatus === "unavailable") return null;
  if (!hasUsablePreview(entry)) return null;

  return createPortal(
    <aside
      ref={panelRef}
      id={id}
      className="hover-preview"
      role="region"
      aria-label={`Enlarged preview of ${entry.name}`}
      tabIndex={-1}
      data-testid="hover-preview"
      data-pinned={pinned ? "true" : undefined}
      data-heavy={profile.cost === "high" || entry.heavy ? "true" : undefined}
      style={{ left: rect.left, top: rect.top, width: rect.width, height: rect.height }}
      onPointerEnter={pinned ? undefined : onKeepOpen}
      onPointerLeave={pinned ? undefined : onScheduleClose}
    >
      <button
        type="button"
        className="hover-preview-close"
        onClick={() => {
          suppressHoverPreview();
          onClose();
        }}
        aria-label="Close enlarged preview"
      >
        <span aria-hidden="true">×</span>
      </button>
      <div className="hover-preview-canvas">
        <PreviewBox entry={entry} forceLive />
      </div>
    </aside>,
    document.body,
  );
}
