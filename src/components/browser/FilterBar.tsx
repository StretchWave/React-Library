// Search + filter controls (M2, extended M5.3). All controls are labeled; the
// search input is focused by the "/" shortcut handled in App and cleared by
// Escape here. v2 filters (aesthetic / source / entry type) come from the
// taxonomies and feed the semantic mirror in src/lib/search.ts.
import type { RefObject } from "react";
import { aesthetics, categories, sources, themes } from "../../catalog/client";

export interface FilterBarProps {
  query: string;
  onQueryChange: (value: string) => void;
  category: string;
  onCategoryChange: (value: string) => void;
  theme: string;
  onThemeChange: (value: string) => void;
  aesthetic?: string;
  onAestheticChange?: (value: string) => void;
  source?: string;
  onSourceChange?: (value: string) => void;
  entryType?: string;
  onEntryTypeChange?: (value: string) => void;
  searchInputRef?: RefObject<HTMLInputElement | null>;
}

export function FilterBar({
  query,
  onQueryChange,
  category,
  onCategoryChange,
  theme,
  onThemeChange,
  aesthetic = "",
  onAestheticChange,
  source = "",
  onSourceChange,
  entryType = "",
  onEntryTypeChange,
  searchInputRef,
}: FilterBarProps) {
  return (
    <div className="filter-bar">
      <label className="filter-select-label" htmlFor="component-search">
        Search components
      </label>
      <input
        id="component-search"
        className="filter-input"
        type="search"
        placeholder="Search by id, name, tag, alias — press / to focus"
        value={query}
        ref={searchInputRef}
        onChange={(event) => onQueryChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            onQueryChange("");
            event.preventDefault();
          }
        }}
      />
      <div className="filter-row">
        <label className="filter-select-label">
          Category
          <select
            className="filter-select"
            value={category}
            onChange={(event) => onCategoryChange(event.target.value)}
          >
            <option value="">All categories</option>
            {categories.map((categoryOption) => (
              <option key={categoryOption.id} value={categoryOption.id}>
                {categoryOption.label}
              </option>
            ))}
          </select>
        </label>
        <label className="filter-select-label">
          Filter by theme
          <select
            className="filter-select"
            value={theme}
            onChange={(event) => onThemeChange(event.target.value)}
          >
            <option value="">All themes</option>
            {themes.map((themeOption) => (
              <option key={themeOption.id} value={themeOption.id}>
                {themeOption.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="filter-row">
        <label className="filter-select-label">
          Filter by aesthetic
          <select
            className="filter-select"
            value={aesthetic}
            onChange={(event) => onAestheticChange?.(event.target.value)}
          >
            <option value="">All aesthetics</option>
            {aesthetics.map((aestheticOption) => (
              <option key={aestheticOption.id} value={aestheticOption.id}>
                {aestheticOption.label}
              </option>
            ))}
          </select>
        </label>
        <label className="filter-select-label">
          Filter by source library
          <select
            className="filter-select"
            value={source}
            onChange={(event) => onSourceChange?.(event.target.value)}
          >
            <option value="">All source libraries</option>
            {sources.map((sourceOption) => (
              <option key={sourceOption.id} value={sourceOption.id}>
                {sourceOption.name}
              </option>
            ))}
          </select>
        </label>
        <label className="filter-select-label">
          Catalog availability
          <select
            className="filter-select"
            aria-label="Catalog availability"
            value={entryType}
            onChange={(event) => onEntryTypeChange?.(event.target.value)}
          >
            <option value="">Local and external</option>
            <option value="local">Local only</option>
            <option value="external">External references only</option>
          </select>
        </label>
      </div>
    </div>
  );
}
