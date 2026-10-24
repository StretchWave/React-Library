// App shell (M3). Catalog data remains the single source of truth; this view
// composes the browser (search/filters/detail), the taxonomy-driven theme
// engine (ThemeProvider/ThemePicker), and live component previews.
import { useEffect, useMemo, useRef, useState } from "react";
import { DetailPane } from "./components/browser/DetailPane";
import { EntryList } from "./components/browser/EntryList";
import { FilterBar } from "./components/browser/FilterBar";
import { PreviewPanel } from "./components/browser/PreviewPanel";
import { catalogCounts, entries, findEntry } from "./catalog/client";
import { hasActiveFilters, searchEntries } from "./lib/search";
import { ThemePicker } from "./theme/ThemePicker";
import "./components/browser/browser.css";
import "./components/browser/preview.css";

/** Deep links look like `#/component/<id>` (MASTER_SPEC.md §10 M4). */
function entryIdFromHash(): string | null {
  const match = /#\/component\/([a-z0-9-]+)/.exec(window.location.hash);
  return match ? match[1] : null;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT" ||
    target.isContentEditable
  );
}

export default function App() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [theme, setTheme] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    // "/" focuses search unless the user is already typing somewhere editable.
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "/" && !isEditableTarget(event.target)) {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    // Hash deep links: honor #/component/<id>, keep back/forward in sync.
    const syncFromHash = () => {
      const id = entryIdFromHash();
      if (id && findEntry(id)) setSelectedId(id);
      else setSelectedId(null);
    };
    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, []);

  function selectEntry(id: string) {
    window.location.hash = `/component/${id}`;
    setSelectedId(id);
  }

  const filtersActive = hasActiveFilters(query, { category, theme });
  const filtered = useMemo(
    () => searchEntries(entries, query, { category, theme }),
    [query, category, theme],
  );
  const selected = selectedId ? (entries.find((entry) => entry.id === selectedId) ?? null) : null;

  function resetFilters() {
    setQuery("");
    setCategory("");
    setTheme("");
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-heading">
          <h1 className="app-title">React Library</h1>
          <p className="app-tagline">
            Agent-first component catalog — {catalogCounts.entries} components,{" "}
            {catalogCounts.themes} themes
          </p>
        </div>
        <ThemePicker />
      </header>
      <main className="app-main">
        <section className="entry-nav" aria-label="Component catalog">
          <FilterBar
            query={query}
            onQueryChange={setQuery}
            category={category}
            onCategoryChange={setCategory}
            theme={theme}
            onThemeChange={setTheme}
            searchInputRef={searchInputRef}
          />
          <EntryList
            entries={filtered}
            totalCount={catalogCounts.entries}
            selectedId={selectedId}
            onSelect={selectEntry}
            filtersActive={filtersActive}
            onResetFilters={resetFilters}
          />
        </section>
        <section className="detail-pane" aria-label="Component details">
          <DetailPane entry={selected} />
          <PreviewPanel entry={selected} />
        </section>
      </main>
    </div>
  );
}
