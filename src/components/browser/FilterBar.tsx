// Search + filter controls (M2). All controls are labeled; the search input is
// focused by the "/" shortcut handled in App and cleared by Escape here.
import type { RefObject } from "react";
import { categories, themes } from "../../catalog/client";

export interface FilterBarProps {
  query: string;
  onQueryChange: (value: string) => void;
  category: string;
  onCategoryChange: (value: string) => void;
  theme: string;
  onThemeChange: (value: string) => void;
  searchInputRef?: RefObject<HTMLInputElement | null>;
}

export function FilterBar({
  query,
  onQueryChange,
  category,
  onCategoryChange,
  theme,
  onThemeChange,
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
          Theme
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
    </div>
  );
}
