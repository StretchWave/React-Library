// Adaptive gallery tile. The canonical preview profile controls the card span,
// aspect ratio and live/snapshot decision; the entry supplies the visible type,
// trigger and technique signals. Actions stay explicit and keyboard reachable:
// details (inspector), expand, favorite and selection. No stretched overlay
// blocks an interactive live stage.
import { useCallback, useEffect, useId, useRef, useState, type CSSProperties } from "react";
import type { CatalogEntry } from "../../catalog/types";
import {
  componentTypeById,
  techniqueById,
  triggerById,
} from "../../catalog/client";
import { layoutStyle, previewStatusLabel, profileOf } from "../../catalog/preview";
import { HoverPreview } from "./HoverPreview";
import { isHoverPreviewSuppressed } from "./hoverPreviewGuard";
import { PreviewBox, previewKind } from "./PreviewBox";

export interface GalleryCardProps {
  entry: CatalogEntry;
  selected?: boolean;
  favorite?: boolean;
  onToggleSelect?: (id: string, next: boolean) => void;
  onToggleFavorite?: (id: string) => void;
  onOpen?: (id: string) => void;
  onExpand?: (id: string) => void;
}

function labelFor(id: string, kind: "type" | "trigger" | "technique"): string {
  if (kind === "type") return componentTypeById(id)?.label ?? id;
  if (kind === "trigger") return triggerById(id)?.label ?? id;
  return techniqueById(id)?.label ?? id;
}

export function GalleryCard({
  entry,
  selected = false,
  favorite = false,
  onToggleSelect,
  onToggleFavorite,
  onOpen,
  onExpand,
}: GalleryCardProps) {
  const profile = profileOf(entry);
  const kind = previewKind(entry);
  const panelId = useId();
  const cardRef = useRef<HTMLLIElement | null>(null);
  const quickPreviewRef = useRef<HTMLButtonElement | null>(null);
  const [hoverAnchor, setHoverAnchor] = useState<DOMRect | null>(null);
  const [pinned, setPinned] = useState(false);
  const [canHover] = useState(
    () =>
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(hover: hover)").matches,
  );
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoverCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearHoverTimer = useCallback(() => {
    if (hoverTimer.current !== null) {
      clearTimeout(hoverTimer.current);
      hoverTimer.current = null;
    }
  }, []);

  const clearHoverCloseTimer = useCallback(() => {
    if (hoverCloseTimer.current !== null) {
      clearTimeout(hoverCloseTimer.current);
      hoverCloseTimer.current = null;
    }
  }, []);

  const scheduleHoverClose = useCallback(() => {
    clearHoverCloseTimer();
    if (pinned) return;
    // The delay covers the gap between the card and the floating panel and
    // lets a drag that briefly leaves both surfaces continue.
    hoverCloseTimer.current = setTimeout(() => {
      hoverCloseTimer.current = null;
      // A pinned panel and keyboard focus inside either surface outrank the
      // pointer leaving; only an explicit dismissal closes those.
      const panel = document.getElementById(panelId);
      if (panel?.contains(document.activeElement)) return;
      setHoverAnchor(null);
    }, 220);
  }, [clearHoverCloseTimer, panelId, pinned]);

  const closeHover = useCallback(() => {
    clearHoverTimer();
    clearHoverCloseTimer();
    setHoverAnchor(null);
    setPinned(false);
  }, [clearHoverTimer, clearHoverCloseTimer]);

  /** Dismisses the panel and, when the open was explicit or focus was inside,
   *  returns focus to the card's enlarged-preview control instead of dropping
   *  it on <body>. */
  const closePanel = useCallback(() => {
    const panel = document.getElementById(panelId);
    const focusWasInside = Boolean(panel && panel.contains(document.activeElement));
    closeHover();
    if (pinned || focusWasInside) quickPreviewRef.current?.focus();
  }, [closeHover, panelId, pinned]);

  const togglePinnedPreview = useCallback(() => {
    if (hoverAnchor) {
      closePanel();
      return;
    }
    const card = cardRef.current;
    if (!card) return;
    clearHoverTimer();
    clearHoverCloseTimer();
    setPinned(true);
    setHoverAnchor(card.getBoundingClientRect());
  }, [clearHoverCloseTimer, clearHoverTimer, closePanel, hoverAnchor]);

  useEffect(
    () => () => {
      clearHoverTimer();
      clearHoverCloseTimer();
    },
    [clearHoverTimer, clearHoverCloseTimer],
  );

  const panelEligible =
    kind !== "external" &&
    kind !== "none" &&
    profile.previewStatus !== "unavailable" &&
    profile.previewStatus !== "error";
  const hoverPreviewEnabled = canHover && panelEligible;
  const typeLabel = entry.types[0] ? labelFor(entry.types[0], "type") : "Component";
  const signalLabel = entry.techniques[0]
    ? labelFor(entry.techniques[0], "technique")
    : entry.triggers[0]
      ? labelFor(entry.triggers[0], "trigger")
      : "Static";
  const status = previewStatusLabel(entry);

  return (
    <li
      ref={cardRef}
      className={`gallery-card rl-gallery-card--${profile.layout} ${selected ? "is-selected" : ""}`}
      data-entry-id={entry.id}
      data-preview-kind={kind}
      data-layout={profile.layout}
      style={layoutStyle(entry) as CSSProperties}
      onMouseEnter={(event) => {
        if (!hoverPreviewEnabled || window.innerWidth < 900 || window.innerHeight < 600) return;
        if (isHoverPreviewSuppressed()) return;
        clearHoverCloseTimer();
        // Returning from the panel keeps the already-open preview alive.
        if (hoverAnchor) return;
        closeHover();
        const card = event.currentTarget;
        hoverTimer.current = setTimeout(() => {
          hoverTimer.current = null;
          // Scrolling or a missed mouseleave can move the card out from under
          // the pointer while the delay is pending; do not open a stale panel.
          if (!card.matches(":hover")) return;
          setHoverAnchor(card.getBoundingClientRect());
        }, 350);
      }}
      onMouseLeave={scheduleHoverClose}
    >
      <div className="gallery-card-preview">
        <PreviewBox entry={entry} />
        {panelEligible ? (
          <button
            ref={quickPreviewRef}
            type="button"
            className={`gallery-quick-preview ${hoverAnchor ? "is-active" : ""}`}
            onClick={togglePinnedPreview}
            aria-expanded={Boolean(hoverAnchor)}
            aria-controls={hoverAnchor ? panelId : undefined}
            aria-label={
              hoverAnchor
                ? `Close enlarged preview of ${entry.name}`
                : `Open enlarged preview of ${entry.name}`
            }
          >
            <span aria-hidden="true">{"\u29C9"}</span>
          </button>
        ) : null}
        <button
          type="button"
          className="gallery-expand"
          onClick={() => {
            closeHover();
            onExpand?.(entry.id);
          }}
          aria-label={`Expand preview of ${entry.name}`}
        >
          <span aria-hidden="true">{"\u2922"}</span>
        </button>
        <button
          type="button"
          className={`gallery-favorite ${favorite ? "is-active" : ""}`}
          onClick={() => onToggleFavorite?.(entry.id)}
          aria-pressed={favorite}
          aria-label={favorite ? `Remove ${entry.name} from favorites` : `Add ${entry.name} to favorites`}
        >
          <span aria-hidden="true">{favorite ? "\u2605" : "\u2606"}</span>
        </button>
      </div>
      <div className="gallery-card-body">
        <div className="gallery-card-heading">
          <button
            type="button"
            className="gallery-title-button"
            onClick={() => {
              closeHover();
              onOpen?.(entry.id);
            }}
            aria-label={`Open details for ${entry.name}`}
          >
            {entry.name}
          </button>
          <span className="gallery-preview-status" data-cost={profile.cost}>
            {status}
          </span>
        </div>
        <div className="gallery-card-tags" aria-label={`${entry.name} classification`}>
          <span className="gallery-tag gallery-tag--type">{typeLabel}</span>
          <span className="gallery-tag">{signalLabel}</span>
          <span className="gallery-tag gallery-tag--muted">{profile.layout}</span>
        </div>
      </div>
      <label className="gallery-frame-select">
        <input
          type="checkbox"
          className="select-check"
          checked={selected}
          onChange={(event) => onToggleSelect?.(entry.id, event.target.checked)}
          aria-label={`Select ${entry.name} for the master prompt`}
        />
        <span className="select-check-mark" aria-hidden="true">
          {"\u2713"}
        </span>
      </label>
      {hoverAnchor ? (
        <HoverPreview
          entry={entry}
          anchor={hoverAnchor}
          id={panelId}
          onClose={closePanel}
          onKeepOpen={clearHoverCloseTimer}
          onScheduleClose={scheduleHoverClose}
          pinned={pinned}
        />
      ) : null}
    </li>
  );
}
