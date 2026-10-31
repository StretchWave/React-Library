// Faceted discovery rail. Filters are independent dimensions: choices inside
// one group combine with OR, groups combine with AND (implemented in
// src/lib/search.ts). Desktop collapse and the mobile drawer are controlled by
// App; this component only renders state and raises changes.
import { useMemo, useState } from "react";
import type { CatalogEntry, FacetDoc } from "../../catalog/types";
import {
  attributes,
  categories,
  componentTypes,
  sources,
  techniques,
  triggers,
  aesthetics,
} from "../../catalog/client";
import type { SearchFilters } from "../../lib/search";
import { valuesOf } from "../../lib/search";
import type { SavedFilter } from "../../lib/personal";

export type FacetKey =
  | "types"
  | "triggers"
  | "techniques"
  | "vibe"
  | "tech"
  | "source"
  | "previewMode"
  | "entryType"
  | "category";

interface Option {
  id: string;
  label: string;
  description?: string;
  count: number;
}

interface Group {
  key: FacetKey;
  label: string;
  options: Option[];
  description: string;
}

export interface FacetSidebarProps {
  entries: CatalogEntry[];
  filters: SearchFilters;
  onToggleFacet: (key: FacetKey, value: string) => void;
  onClearFilters: () => void;
  onClose?: () => void;
  savedFilters: SavedFilter[];
  onApplySavedFilter: (saved: SavedFilter) => void;
  onDeleteSavedFilter: (id: string) => void;
  onSaveFilter: (name: string) => void;
  mobileOpen?: boolean;
}

function countValues(
  entries: CatalogEntry[],
  key: "types" | "triggers" | "techniques" | "aesthetics" | "attributes" | "source" | "category",
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const entry of entries) {
    const raw = (entry as unknown as Record<string, unknown>)[key];
    const values = Array.isArray(raw) ? raw : typeof raw === "string" ? [raw] : [];
    for (const value of values) {
      if (typeof value === "string") counts[value] = (counts[value] ?? 0) + 1;
    }
  }
  return counts;
}

function facetOptions(docs: FacetDoc[], counts: Record<string, number>, zeroLabel = "none"): Option[] {
  return docs
    .map((doc) => ({
      id: doc.id,
      label: doc.label,
      description: doc.description,
      count: counts[doc.id] ?? 0,
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label) || zeroLabel.localeCompare(zeroLabel));
}

const PREVIEW_OPTIONS: Array<{ id: string; label: string; description: string }> = [
  { id: "live", label: "Live preview", description: "Run safely in the preview stage." },
  { id: "snapshot", label: "Snapshot", description: "Captured still image." },
  { id: "loop", label: "Captured loop", description: "Captured video loop." },
  { id: "external", label: "External reference", description: "Official link only; not run locally." },
  { id: "unavailable", label: "Unavailable", description: "No verified preview exists." },
];

const ENTRY_TYPE_OPTIONS = [
  { id: "local", label: "Usable locally", description: "Source or implementation is available." },
  { id: "external", label: "Reference only", description: "Retrieve from the official source." },
];

export function FacetSidebar({
  entries,
  filters,
  onToggleFacet,
  onClearFilters,
  onClose,
  savedFilters,
  onApplySavedFilter,
  onDeleteSavedFilter,
  onSaveFilter,
  mobileOpen = false,
}: FacetSidebarProps) {
  const [facetQuery, setFacetQuery] = useState("");
  const [saveName, setSaveName] = useState("");
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    types: true,
    triggers: true,
    techniques: false,
    vibe: false,
    tech: false,
    source: false,
    previewMode: false,
    entryType: false,
    category: false,
  });

  const counts = useMemo(() => {
    const sourceCounts = countValues(entries, "source");
    const previewCounts: Record<string, number> = {};
    for (const entry of entries) {
      const mode = entry.previewProfile?.mode ?? "unavailable";
      previewCounts[mode] = (previewCounts[mode] ?? 0) + 1;
    }
    const typeCounts: Record<string, number> = {};
    for (const entry of entries) for (const type of entry.types) typeCounts[type] = (typeCounts[type] ?? 0) + 1;
    return {
      types: typeCounts,
      triggers: countValues(entries, "triggers"),
      techniques: countValues(entries, "techniques"),
      aesthetic: countValues(entries, "aesthetics"),
      tech: countValues(entries, "attributes"),
      source: sourceCounts,
      category: countValues(entries, "category"),
      previewMode: previewCounts,
      entryType: {
        local: entries.filter((entry) => (entry.entryType ?? "local") === "local").length,
        external: entries.filter((entry) => entry.entryType === "external").length,
      },
    };
  }, [entries]);

  const groups: Group[] = useMemo(() => {
    const techDocs = attributes.filter((attribute) => attribute.group === "tech");
    const sourceDocs: FacetDoc[] = sources.map((source) => ({
      id: source.id,
      label: source.name,
      description: source.status,
    }));
    const previewGroups = PREVIEW_OPTIONS.map((option) => ({
      ...option,
      count: counts.previewMode[option.id] ?? 0,
    }));
    return [
      {
        key: "types",
        label: "Component type",
        description: "What the component is. Multiple values combine with OR.",
        options: facetOptions(componentTypes, counts.types),
      },
      {
        key: "triggers",
        label: "Animation trigger",
        description: "What starts the motion.",
        options: facetOptions(triggers, counts.triggers),
      },
      {
        key: "techniques",
        label: "Technique",
        description: "How the effect is made or moves.",
        options: facetOptions(techniques, counts.techniques),
      },
      {
        key: "vibe",
        label: "Visual vibe",
        description: "Visual style, separate from app themes.",
        options: facetOptions(aesthetics, counts.aesthetic),
      },
      {
        key: "tech",
        label: "Technology",
        description: "Technical traits and runtimes.",
        options: facetOptions(techDocs, counts.tech),
      },
      {
        key: "source",
        label: "Source",
        description: "Origin library or reference.",
        options: facetOptions(sourceDocs, counts.source),
      },
      {
        key: "previewMode",
        label: "Preview availability",
        description: "Honest preview mode from the catalog profile.",
        options: previewGroups,
      },
      {
        key: "entryType",
        label: "Availability",
        description: "Local implementation vs official retrieval.",
        options: ENTRY_TYPE_OPTIONS.map((option) => ({ ...option, count: counts.entryType[option.id as "local" | "external"] })),
      },
      {
        key: "category",
        label: "Catalog category",
        description: "Legacy structural grouping.",
        options: facetOptions(categories, counts.category),
      },
    ];
  }, [counts]);

  const selectedCount = Object.keys(filters).reduce((total, key) => {
    const value = filters[key as keyof SearchFilters];
    return total + valuesOf(value).length;
  }, 0);

  const normalizedQuery = facetQuery.trim().toLowerCase();

  return (
    <aside
      className={`facet-sidebar ${mobileOpen ? "is-mobile-open" : ""}`}
      aria-label="Discovery filters"
      data-mobile-open={mobileOpen ? "true" : "false"}
    >
      <div className="facet-head">
        <div>
          <h2 className="facet-title">Discover</h2>
          <p className="facet-subtitle">AND across groups, OR inside one group.</p>
        </div>
        {onClose ? (
          <button type="button" className="facet-close" onClick={onClose} aria-label="Close filters">
            Close
          </button>
        ) : null}
      </div>
      <label className="facet-search">
        <span className="visually-hidden">Filter facet names</span>
        <input
          type="search"
          value={facetQuery}
          onChange={(event) => setFacetQuery(event.target.value)}
          placeholder="Find a facet"
        />
      </label>
      <div className="facet-active-row">
        <span>
          {selectedCount} active filter{selectedCount === 1 ? "" : "s"}
        </span>
        {selectedCount > 0 ? (
          <button type="button" className="facet-clear" onClick={onClearFilters}>
            Clear
          </button>
        ) : null}
      </div>
      <div className="facet-groups">
        {groups.map((group) => {
          const options = group.options.filter(
            (option) => !normalizedQuery || `${option.label} ${option.description ?? ""}`.toLowerCase().includes(normalizedQuery),
          );
          if (options.length === 0) return null;
          const selected = valuesOf(filters[group.key as keyof SearchFilters]);
          const isOpen = normalizedQuery ? true : openGroups[group.key];
          return (
            <section key={group.key} className={`facet-group ${isOpen ? "is-open" : ""}`}>
              <button
                type="button"
                className="facet-group-toggle"
                aria-expanded={isOpen}
                onClick={() =>
                  setOpenGroups((current) => ({ ...current, [group.key]: !current[group.key] }))
                }
              >
                <span>{group.label}</span>
                <span className="facet-group-meta">
                  {selected.length > 0 ? `${selected.length} selected ` : ""}
                  <span aria-hidden="true">{isOpen ? "-" : "+"}</span>
                </span>
              </button>
              {isOpen ? (
                <div className="facet-options">
                  <p className="facet-description">{group.description}</p>
                  {options.map((option) => (
                    <label key={option.id} className="facet-option" data-empty={option.count === 0 ? "true" : "false"}>
                      <input
                        type="checkbox"
                        checked={selected.includes(option.id)}
                        aria-label={`${option.label} (${option.count})`}
                        onChange={() => onToggleFacet(group.key, option.id)}
                      />
                      <span className="facet-option-label">{option.label}</span>
                      <span className="facet-option-count">{option.count}</span>
                    </label>
                  ))}
                </div>
              ) : null}
            </section>
          );
        })}
      </div>
      <section className="saved-views" aria-label="Saved views">
        <h3 className="saved-views-title">Saved views</h3>
        {savedFilters.length === 0 ? (
          <p className="saved-views-empty">Save this filter combination for one-click recall.</p>
        ) : (
          <ul className="saved-views-list">
            {savedFilters.map((saved) => (
              <li key={saved.id}>
                <button
                  type="button"
                  className="saved-view-apply"
                  onClick={() => onApplySavedFilter(saved)}
                >
                  {saved.name}
                </button>
                <button
                  type="button"
                  className="saved-view-delete"
                  onClick={() => onDeleteSavedFilter(saved.id)}
                  aria-label={`Delete saved view ${saved.name}`}
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="saved-view-form">
          <label>
            <span className="visually-hidden">Saved view name</span>
            <input
              type="text"
              value={saveName}
              onChange={(event) => setSaveName(event.target.value)}
              placeholder="Name this view"
              maxLength={60}
            />
          </label>
          <button
            type="button"
            onClick={() => {
              if (!saveName.trim()) return;
              onSaveFilter(saveName);
              setSaveName("");
            }}
            disabled={!saveName.trim()}
          >
            Save
          </button>
        </div>
      </section>
    </aside>
  );
}
