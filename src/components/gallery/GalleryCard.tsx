// Gallery card (M5.3; M7.3 redesign): preview-first composition. The preview
// region is the card's dominant surface; the in-app preview workspace is the
// primary inspect action; the original source stays a separate, explicitly
// labeled action so inspecting a card never navigates away from the catalog.
import type { CatalogEntry } from "../../catalog/types";
import { aestheticById, attributeById, categoryById, sourceById } from "../../catalog/client";
import { entryTypeOf } from "../../catalog/types";
import { statusChipClass } from "../browser/statusChip";
import { PreviewBox, previewKind } from "./PreviewBox";

export interface GalleryCardProps {
  entry: CatalogEntry;
  onOpenDetail: (id: string) => void;
  selected?: boolean;
  onToggleSelect?: (id: string, next: boolean) => void;
}

const VISIBLE_ATTRIBUTES = 4;

/** Compact kind chip copy keeps the card honest about what the frame shows. */
function kindChipLabel(kind: string, heavy: boolean): { chip: string; label: string } {
  if (kind === "local-demo") {
    return heavy ? { chip: "poster", label: "heavy · runs in workspace" } : { chip: "live", label: "live" };
  }
  if (kind === "external" || kind === "source-link") {
    return { chip: "external", label: "official demo off-site" };
  }
  if (kind === "static") return { chip: "poster", label: "static still" };
  return { chip: "poster", label: "no preview yet" };
}

export function GalleryCard({ entry, onOpenDetail, selected = false, onToggleSelect }: GalleryCardProps) {
  const type = entryTypeOf(entry);
  const categoryLabel = categoryById(entry.category)?.label ?? entry.category;
  const sourceDoc = entry.source ? sourceById(entry.source) : undefined;
  const licenseText = entry.license?.spdx ?? (entry.license?.note ? "license note in details" : "");
  const aesthetics = (entry.aesthetics ?? []).map((id) => aestheticById(id)?.label ?? id);
  const attributes = (entry.attributes ?? []).map((id) => attributeById(id)?.label ?? id);
  const overflow = Math.max(0, attributes.length - VISIBLE_ATTRIBUTES);
  const kind = previewKind(entry);
  const heavy = Boolean(entry.heavy);
  const chip = kindChipLabel(kind, heavy);

  return (
    <li
      className={`gallery-card ${selected ? "is-selected" : ""}`}
      data-entry-id={entry.id}
      data-preview-kind={kind}
    >
      <div className="gallery-frame-wrap" data-preview-kind={kind}>
        <label className="gallery-frame-select">
          <input
            type="checkbox"
            className="select-check"
            checked={selected}
            onChange={(event) => onToggleSelect?.(entry.id, event.target.checked)}
            aria-label={`Select ${entry.name} for the master prompt`}
          />
          <span aria-hidden="true">Select</span>
        </label>
        <PreviewBox entry={entry} />
      </div>
      <div className="gallery-card-head">
        <h3 className="gallery-title">{entry.name}</h3>
        <span className={`status-chip ${statusChipClass(entry)}`}>{entry.status}</span>
      </div>
      <p className="gallery-summary">{entry.summary}</p>
      <div className="chip-row" aria-label={`${entry.name} catalog facts`}>
        <span className="type-chip" data-type={type}>
          {type === "external" ? "external reference" : "local"}
        </span>
        <span className="neutral-chip">{categoryLabel}</span>
        {sourceDoc ? <span className="neutral-chip">{sourceDoc.name}</span> : null}
        {licenseText ? <span className="license-chip">{licenseText}</span> : null}
      </div>
      {aesthetics.length > 0 ? (
        <div className="chip-row" aria-label={`${entry.name} aesthetics`}>
          {aesthetics.map((label) => (
            <span key={label} className="aesthetic-chip">
              {label}
            </span>
          ))}
        </div>
      ) : null}
      {attributes.length > 0 ? (
        <div className="chip-row" aria-label={`${entry.name} attributes`}>
          {attributes.slice(0, VISIBLE_ATTRIBUTES).map((label) => (
            <span key={label} className="neutral-chip">
              {label}
            </span>
          ))}
          {overflow > 0 ? <span className="neutral-chip">+{overflow}</span> : null}
        </div>
      ) : null}
      <div className="gallery-actions">
        <a
          className="gallery-preview-open"
          href={`#/preview/${entry.id}`}
          aria-label={`Open ${entry.name} in the preview workspace`}
        >
          Preview <span aria-hidden="true">↗</span>
        </a>
        <span className={`kind-chip`} data-chip={chip.chip}>
          {chip.label}
        </span>
        <button
          type="button"
          className="gallery-details"
          aria-label={`Open details for ${entry.name}`}
          onClick={() => onOpenDetail(entry.id)}
        >
          Details
        </button>
      </div>
    </li>
  );
}
