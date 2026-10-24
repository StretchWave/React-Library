// Gallery card (M5.3; +M5.4 selection checkbox): preview box + name/status +
// category + source/type + license indicators + aesthetic & attribute chips.
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

export function GalleryCard({ entry, onOpenDetail, selected = false, onToggleSelect }: GalleryCardProps) {
  const type = entryTypeOf(entry);
  const categoryLabel = categoryById(entry.category)?.label ?? entry.category;
  const sourceDoc = entry.source ? sourceById(entry.source) : undefined;
  const licenseText = entry.license?.spdx ?? (entry.license?.note ? "license note in details" : "");
  const aesthetics = (entry.aesthetics ?? []).map((id) => aestheticById(id)?.label ?? id);
  const attributes = (entry.attributes ?? []).map((id) => attributeById(id)?.label ?? id);
  const overflow = Math.max(0, attributes.length - VISIBLE_ATTRIBUTES);

  return (
    <li
      className={`gallery-card ${selected ? "is-selected" : ""}`}
      data-entry-id={entry.id}
      data-preview-kind={previewKind(entry)}
    >
      <div className="gallery-select-row">
        <label className="select-check-label">
          <input
            type="checkbox"
            className="select-check"
            checked={selected}
            onChange={(event) => onToggleSelect?.(entry.id, event.target.checked)}
            aria-label={`Select ${entry.name} for the master prompt`}
          />
          <span aria-hidden="true">Select</span>
        </label>
      </div>
      <PreviewBox entry={entry} />
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
      <button
        type="button"
        className="gallery-details"
        aria-label={`Open details for ${entry.name}`}
        onClick={() => onOpenDetail(entry.id)}
      >
        Details
      </button>
    </li>
  );
}
