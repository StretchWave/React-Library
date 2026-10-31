// Adaptive gallery tile. The canonical preview profile controls the card span,
// aspect ratio and live/snapshot decision; the entry supplies the visible type,
// trigger and technique signals. Actions stay explicit and keyboard reachable:
// details (inspector), enlarge/pin, expand, favorite and selection.
//
// Since M8.1 the card no longer owns hover timers or a floating panel. It only
// reports pointer intent to Gallery's single controller, which renders at most
// one preview. This removes per-card open/close races entirely.
import { useRef, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import type { CatalogEntry } from "../../catalog/types";
import {
  componentTypeById,
  techniqueById,
  triggerById,
} from "../../catalog/client";
import { layoutStyle, previewStatusLabel, profileOf } from "../../catalog/preview";
import { PreviewBox, previewKind } from "./PreviewBox";

export interface GalleryCardProps {
  entry: CatalogEntry;
  selected?: boolean;
  favorite?: boolean;
  /** The gallery controller currently shows this entry's panel. */
  previewActive?: boolean;
  previewPanelId?: string;
  onPreviewEnter?: (
    entry: CatalogEntry,
    card: HTMLElement,
    pointerType: string,
    point: { x: number; y: number },
  ) => void;
  onPreviewLeave?: (id: string) => void;
  onTogglePreview?: (entry: CatalogEntry, card: HTMLElement, trigger: HTMLElement) => void;
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
  previewActive = false,
  previewPanelId,
  onPreviewEnter,
  onPreviewLeave,
  onTogglePreview,
  onToggleSelect,
  onToggleFavorite,
  onOpen,
  onExpand,
}: GalleryCardProps) {
  const profile = profileOf(entry);
  const kind = previewKind(entry);
  const cardRef = useRef<HTMLLIElement | null>(null);
  const quickPreviewRef = useRef<HTMLButtonElement | null>(null);

  const panelEligible =
    kind !== "external" &&
    kind !== "none" &&
    profile.previewStatus !== "unavailable" &&
    profile.previewStatus !== "error";
  const typeLabel = entry.types[0] ? labelFor(entry.types[0], "type") : "Component";
  const signalLabel = entry.techniques[0]
    ? labelFor(entry.techniques[0], "technique")
    : entry.triggers[0]
      ? labelFor(entry.triggers[0], "trigger")
      : "Static";
  const status = previewStatusLabel(entry);

  function onPointerEnter(event: ReactPointerEvent<HTMLLIElement>): void {
    if (!panelEligible) return;
    if (window.innerWidth < 900 || window.innerHeight < 600) return;
    onPreviewEnter?.(entry, event.currentTarget, event.pointerType, {
      x: event.clientX,
      y: event.clientY,
    });
  }

  return (
    <li
      ref={cardRef}
      className={`gallery-card rl-gallery-card--${profile.layout} ${selected ? "is-selected" : ""}`}
      data-entry-id={entry.id}
      data-preview-kind={kind}
      data-layout={profile.layout}
      style={layoutStyle(entry) as CSSProperties}
      onPointerEnter={onPointerEnter}
      onPointerLeave={() => onPreviewLeave?.(entry.id)}
    >
      <div className="gallery-card-preview">
        <PreviewBox entry={entry} />
        {panelEligible ? (
          <button
            ref={quickPreviewRef}
            type="button"
            className={`gallery-quick-preview ${previewActive ? "is-active" : ""}`}
            onClick={() => {
              const card = cardRef.current;
              const trigger = quickPreviewRef.current;
              if (card && trigger) onTogglePreview?.(entry, card, trigger);
            }}
            aria-expanded={previewActive}
            aria-controls={previewActive ? previewPanelId : undefined}
            aria-label={
              previewActive
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
          onClick={() => onExpand?.(entry.id)}
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
            onClick={() => onOpen?.(entry.id)}
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
    </li>
  );
}
