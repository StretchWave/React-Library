// App shell (M3; extended M5.3): catalog data remains the single source of
// truth; this view composes the browser (search/filters/detail), the gallery
// (visual card grid over the same filters), the taxonomy-driven theme engine
// (ThemeProvider/ThemePicker), and live component previews.
import { useEffect, useMemo, useRef, useState } from "react";
import { DetailPane } from "./components/browser/DetailPane";
import { EntryList } from "./components/browser/EntryList";
import { FilterBar } from "./components/browser/FilterBar";
import { PreviewPanel } from "./components/browser/PreviewPanel";
import { Gallery } from "./components/gallery/Gallery";
import { catalogCounts, entries, findEntry } from "./catalog/client";
import { hasActiveFilters, searchEntries, type SearchFilters } from "./lib/search";
import { entryTypeOf } from "./catalog/types";
import { ThemePicker } from "./theme/ThemePicker";
import "./components/browser/browser.css";
import "./components/browser/preview.css";
import "./components/gallery/gallery.css";

type View = "browser" | "gallery";

/** Deep links look like `#/component/<id>` (M4) and `#/gallery` (M5.3). */
function entryIdFromHash(): string | null {
  const match = /#\/component\/([a-z0-9-]+)/.exec(window.location.hash);
  return match ? match[1] : null;
}

function isGalleryHash(): boolean {
  return window.location.hash === "#/gallery";
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
  const [view, setView] = useState<View>("browser");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [theme, setTheme] = useState("");
  const [aesthetic, setAesthetic] = useState("");
  const [source, setSource] = useState("");
  const [entryType, setEntryType] = useState("");
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
    // Hash deep links: honor #/component/<id> and #/gallery, keep back/forward
    // in sync. Filters survive view switches because they live in this shell.
    const syncFromHash = () => {
      const id = entryIdFromHash();
      if (id && findEntry(id)) {
        setView("browser");
        setSelectedId(id);
        return;
      }
      if (isGalleryHash()) {
        setView("gallery");
        return;
      }
      setView("browser");
      setSelectedId(null);
    };
    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, []);

  function selectEntry(id: string) {
    window.location.hash = `/component/${id}`;
    setView("browser");
    setSelectedId(id);
  }

  function openGallery() {
    window.location.hash = "/gallery";
    setView("gallery");
  }

  function openBrowser() {
    setView("browser");
  }

  const filters: SearchFilters = { category, theme, aesthetic, source, entryType };
  const filtersActive = hasActiveFilters(query, filters);
  const filtered = useMemo(
    () => searchEntries(entries, query, filters),
    [query, category, theme, aesthetic, source, entryType],
  );
  const selected = selectedId ? (entries.find((entry) => entry.id === selectedId) ?? null) : null;
  const localCount = useMemo(
    () => entries.filter((entry) => entryTypeOf(entry) === "local").length,
    [],
  );
  const externalCount = entries.length - localCount;

  function resetFilters() {
    setQuery("");
    setCategory("");
    setTheme("");
    setAesthetic("");
    setSource("");
    setEntryType("");
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
      <nav className="app-views" aria-label="Catalog views">
        <button
          type="button"
          className={`view-switch ${view === "browser" ? "is-active" : ""}`}
          aria-pressed={view === "browser"}
          onClick={openBrowser}
        >
          Browser
        </button>
        <button
          type="button"
          className={`view-switch ${view === "gallery" ? "is-active" : ""}`}
          aria-pressed={view === "gallery"}
          onClick={openGallery}
        >
          Gallery
        </button>
        <span className="view-counts">
          {localCount} local · {externalCount} external references
        </span>
      </nav>
      <main className="app-main">
        {view === "gallery" ? (
          <>
            <section className="entry-nav" aria-label="Component gallery filters">
              <FilterBar
                query={query}
                onQueryChange={setQuery}
                category={category}
                onCategoryChange={setCategory}
                theme={theme}
                onThemeChange={setTheme}
                aesthetic={aesthetic}
                onAestheticChange={setAesthetic}
                source={source}
                onSourceChange={setSource}
                entryType={entryType}
                onEntryTypeChange={setEntryType}
                searchInputRef={searchInputRef}
              />
            </section>
            <Gallery
              entries={filtered}
              totalCount={catalogCounts.entries}
              filtersActive={filtersActive}
              onResetFilters={resetFilters}
              onOpenDetail={selectEntry}
            />
          </>
        ) : (
          <>
            <section className="entry-nav" aria-label="Component catalog">
              <FilterBar
                query={query}
                onQueryChange={setQuery}
                category={category}
                onCategoryChange={setCategory}
                theme={theme}
                onThemeChange={setTheme}
                aesthetic={aesthetic}
                onAestheticChange={setAesthetic}
                source={source}
                onSourceChange={setSource}
                entryType={entryType}
                onEntryTypeChange={setEntryType}
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
          </>
        )}
      </main>
    </div>
  );
}
