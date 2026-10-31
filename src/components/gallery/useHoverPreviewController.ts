// One gallery-wide controller for the floating preview (M8.1).
//
// Before this, every card owned its own open/close timers and a document
// pointer listener; they could race, reopen after an explicit dismissal, or
// briefly show two panels. The controller is the only owner of:
//   - which entry is active (at most one),
//   - its anchor rect and interaction mode (hover or pinned),
//   - opening, closing and exit timers,
//   - the last pointer position used to verify a dismissal.
//
// Cards only report pointer intent. The panel reports pointer entry/exit.
// Moving from a card into the panel is safe: the close timer checks the actual
// pointer position against both surfaces plus a small corridor, so a 260 ms
// grace period bridges the visual gap and a slow crossing never flickers.
import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import type { CatalogEntry } from "../../catalog/types";

export type HoverPreviewPhase = "opening" | "open" | "closing";

export interface HoverPreviewState {
  entry: CatalogEntry;
  /** Card rect captured when the panel opens (not re-measured per move). */
  anchor: DOMRect;
  phase: HoverPreviewPhase;
  pinned: boolean;
}

export interface HoverPreviewControllerOptions {
  /** Stable-hover delay before a panel opens. */
  openDelay?: number;
  /** Grace period after leaving both surfaces before the exit starts. */
  closeDelay?: number;
  /** Exit animation duration; the panel stays mounted until it ends. */
  exitDelay?: number;
}

/** Extra pixels around both surfaces that still count as "on the way". */
const CORRIDOR = 12;
/** Suppresses an immediate reopen when a panel is dismissed while the pointer
 *  is already sitting over its card. A deliberate pointer re-entry clears it. */
const DISMISS_GUARD_MS = 500;

type Timer = ReturnType<typeof setTimeout>;

interface Point {
  x: number;
  y: number;
}

export interface HoverPreviewController {
  state: HoverPreviewState | null;
  panelRef: RefObject<HTMLElement | null>;
  /** The pointer entered a card. Touch input never auto-opens. */
  notifyEnter: (
    entry: CatalogEntry,
    card: HTMLElement,
    pointerType?: string,
    point?: { x: number; y: number },
  ) => void;
  /** The pointer left a card. */
  notifyLeave: (entryId: string) => void;
  /** The pointer entered the floating panel. */
  notifyPanelEnter: () => void;
  /** The pointer left the floating panel (pinned panels ignore this). */
  notifyPanelLeave: () => void;
  /** Escape, close button, outside click, scroll or resize. */
  dismiss: () => void;
  /** Keyboard/touch route: open pinned, or close if this entry is open. */
  togglePinned: (entry: CatalogEntry, card: HTMLElement, trigger: HTMLElement) => void;
  isActive: (entryId: string) => boolean;
}

function rectContains(rect: DOMRect | null | undefined, point: Point, padding = 0): boolean {
  if (!rect) return false;
  return (
    point.x >= rect.left - padding &&
    point.x <= rect.right + padding &&
    point.y >= rect.top - padding &&
    point.y <= rect.bottom + padding
  );
}

export function useHoverPreviewController(
  options: HoverPreviewControllerOptions = {},
): HoverPreviewController {
  const { openDelay = 320, closeDelay = 260, exitDelay = 180 } = options;
  const [state, setState] = useState<HoverPreviewState | null>(null);
  const stateRef = useRef<HoverPreviewState | null>(null);
  const panelRef = useRef<HTMLElement | null>(null);
  const cardRef = useRef<HTMLElement | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const pointerRef = useRef<Point>({ x: -1, y: -1 });
  const hoveredCardRef = useRef<HTMLElement | null>(null);
  const blockedRef = useRef<{ id: string; until: number }>({ id: "", until: 0 });

  const openTimer = useRef<Timer | null>(null);
  const closeTimer = useRef<Timer | null>(null);
  const exitTimer = useRef<Timer | null>(null);
  const settleTimer = useRef<Timer | null>(null);

  const commit = useCallback((next: HoverPreviewState | null) => {
    stateRef.current = next;
    setState(next);
  }, []);

  const clearOpen = useCallback(() => {
    if (openTimer.current !== null) {
      clearTimeout(openTimer.current);
      openTimer.current = null;
    }
  }, []);
  const clearClose = useCallback(() => {
    if (closeTimer.current !== null) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);
  const clearExit = useCallback(() => {
    if (exitTimer.current !== null) {
      clearTimeout(exitTimer.current);
      exitTimer.current = null;
    }
  }, []);
  const clearSettle = useCallback(() => {
    if (settleTimer.current !== null) {
      clearTimeout(settleTimer.current);
      settleTimer.current = null;
    }
  }, []);

  const clearAllTimers = useCallback(() => {
    clearOpen();
    clearClose();
    clearExit();
    clearSettle();
  }, [clearClose, clearExit, clearOpen, clearSettle]);

  /** At timer expiry, trust the pointer position rather than a stale leave. */
  const pointerInsideSurfaces = useCallback((): boolean => {
    const point = pointerRef.current;
    if (point.x < 0) {
      // No pointer event yet (keyboard/touch): fall back to DOM hover.
      return Boolean(cardRef.current?.matches(":hover"));
    }
    if (rectContains(panelRef.current?.getBoundingClientRect(), point, CORRIDOR)) return true;
    if (rectContains(cardRef.current?.getBoundingClientRect(), point, CORRIDOR)) return true;
    return false;
  }, []);

  const startExitTimer = useCallback(() => {
    // Never restart an exit that is already counting down; the panel must
    // unmount even when a dismissal, a scroll and a new hover race together.
    if (exitTimer.current !== null) return;
    exitTimer.current = setTimeout(() => {
      exitTimer.current = null;
      if (stateRef.current?.phase === "closing") commit(null);
    }, exitDelay);
  }, [commit, exitDelay]);

  const beginExit = useCallback(() => {
    const current = stateRef.current;
    if (!current) return;
    if (current.phase === "closing") {
      // dismiss() clears timers first, so a closing panel may need its exit
      // timer re-armed; otherwise rapid card switching would clear it.
      startExitTimer();
      return;
    }
    clearAllTimers();
    commit({ ...current, phase: "closing" });
    startExitTimer();
  }, [clearAllTimers, commit, startExitTimer]);

  const scheduleClose = useCallback(() => {
    const current = stateRef.current;
    if (!current || current.pinned || current.phase === "closing") return;
    // Never restart an already-pending close on each pointer move; the timer
    // verifies the pointer at expiry instead.
    if (closeTimer.current !== null) return;
    closeTimer.current = setTimeout(() => {
      closeTimer.current = null;
      if (stateRef.current?.pinned) return;
      if (pointerInsideSurfaces()) return;
      beginExit();
    }, closeDelay);
  }, [beginExit, closeDelay, pointerInsideSurfaces]);

  const notifyEnter = useCallback(
    (
      entry: CatalogEntry,
      card: HTMLElement,
      pointerType = "mouse",
      point?: { x: number; y: number },
    ) => {
      if (pointerType === "touch") return;
      if (!card.isConnected) return;
      if (point) pointerRef.current = point;
      hoveredCardRef.current = card;
      const now = Date.now();
      if (blockedRef.current.id === entry.id) {
        if (now < blockedRef.current.until) return;
        blockedRef.current = { id: "", until: 0 };
      }

      const current = stateRef.current;
      if (current?.pinned) return;
      if (current?.entry.id === entry.id) {
        // Returning from the panel keeps the preview alive.
        clearOpen();
        clearClose();
        clearExit();
        cardRef.current = card;
        if (current.phase !== "open") commit({ ...current, phase: "open" });
        return;
      }

      clearOpen();
      if (current) {
        // A different card: retire the old panel (exit), then open the new one
        // after the stable-hover delay. One panel exists at every moment.
        // beginExit owns the exit timer; calling clearExit() here would cancel
        // an in-flight close and leave a panel stuck in its closing phase when
        // the pointer crosses several cards quickly.
        beginExit();
      } else {
        clearClose();
        clearExit();
      }
      cardRef.current = card;
      const snapshot = entry;
      openTimer.current = setTimeout(() => {
        openTimer.current = null;
        if (!card.isConnected) return;
        if (hoveredCardRef.current !== card) return;
        // Scrolling or a missed leave can move the card out from under the
        // pointer while the delay is pending; never open a stale panel.
        if (!card.matches(":hover") && !rectContains(card.getBoundingClientRect(), pointerRef.current)) {
          return;
        }
        const anchor = card.getBoundingClientRect();
        commit({ entry: snapshot, anchor, phase: "opening", pinned: false });
        settleTimer.current = setTimeout(() => {
          settleTimer.current = null;
          const latest = stateRef.current;
          if (latest?.entry.id === snapshot.id && latest.phase === "opening") {
            commit({ ...latest, phase: "open" });
          }
        }, 20);
      }, openDelay);
    },
    [beginExit, clearClose, clearExit, clearOpen, commit, openDelay],
  );

  const notifyLeave = useCallback(
    (entryId: string) => {
      if (hoveredCardRef.current?.getAttribute("data-entry-id") === entryId) {
        hoveredCardRef.current = null;
      }
      if (blockedRef.current.id === entryId) blockedRef.current = { id: "", until: 0 };
      // Leaving during the opening delay cancels the pending open.
      clearOpen();
      const current = stateRef.current;
      if (!current || current.entry.id !== entryId || current.pinned) return;
      scheduleClose();
    },
    [clearOpen, scheduleClose],
  );

  const notifyPanelEnter = useCallback(() => {
    const current = stateRef.current;
    if (!current || current.pinned) return;
    // A panel already in its exit animation is dismissed; entering it must not
    // resurrect it (for example when a programmatic scroll moves it under the
    // pointer after an explicit close).
    if (current.phase === "closing") return;
    clearClose();
    clearExit();
    if (current.phase !== "open") commit({ ...current, phase: "open" });
  }, [clearClose, clearExit, commit]);

  const notifyPanelLeave = useCallback(() => {
    const current = stateRef.current;
    if (!current || current.pinned) return;
    scheduleClose();
  }, [scheduleClose]);

  const dismiss = useCallback(() => {
    const current = stateRef.current;
    clearAllTimers();
    if (!current) return;
    blockedRef.current = { id: current.entry.id, until: Date.now() + DISMISS_GUARD_MS };
    const restore = current.pinned ? triggerRef.current : null;
    beginExit();
    if (restore?.isConnected) restore.focus();
  }, [beginExit, clearAllTimers]);

  const togglePinned = useCallback(
    (entry: CatalogEntry, card: HTMLElement, trigger: HTMLElement) => {
      const current = stateRef.current;
      if (current?.entry.id === entry.id) {
        dismiss();
        return;
      }
      clearAllTimers();
      triggerRef.current = trigger;
      cardRef.current = card;
      hoveredCardRef.current = card;
      commit({
        entry,
        anchor: card.getBoundingClientRect(),
        phase: "open",
        pinned: true,
      });
    },
    [clearAllTimers, commit, dismiss],
  );

  const isActive = useCallback((entryId: string) => stateRef.current?.entry.id === entryId, []);

  // The controller, not each card, owns the single pointer listener. It only
  // maintains the last position and cancels a pending close while the pointer
  // is inside the card/panel corridor; it never restarts timers per move.
  useEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      pointerRef.current = { x: event.clientX, y: event.clientY };
      const current = stateRef.current;
      if (!current || current.pinned) return;
      if (closeTimer.current !== null && pointerInsideSurfaces()) clearClose();
    };
    const onWindowBlur = () => {
      clearClose();
      scheduleClose();
    };
    document.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("blur", onWindowBlur);
    return () => {
      document.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("blur", onWindowBlur);
    };
  }, [clearClose, pointerInsideSurfaces, scheduleClose]);

  // Every timer is cancelled when the gallery unmounts (route change, filter
  // empty state) so no stale callback can open a panel on a dead card.
  useEffect(() => {
    return () => {
      clearAllTimers();
    };
  }, [clearAllTimers]);

  return {
    state,
    panelRef,
    notifyEnter,
    notifyLeave,
    notifyPanelEnter,
    notifyPanelLeave,
    dismiss,
    togglePinned,
    isActive,
  };
}
