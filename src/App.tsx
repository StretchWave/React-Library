// App shell (M3; extended M5.3): catalog data remains the single source of
// truth; this view composes the browser (search/filters/detail), the gallery
// (visual card grid over the same filters), the taxonomy-driven theme engine
// (ThemeProvider/ThemePicker), and live component previews.
import { useEffect, useMemo, useRef, useState, lazy, Suspense } from "react";
import { DetailPane } from "./components/browser/DetailPane";
import { EntryList } from "./components/browser/EntryList";
import { FilterBar } from "./components/browser/FilterBar";
import { PreviewPanel } from "./components/browser/PreviewPanel";
import { Gallery } from "./components/gallery/Gallery";
import { PromptStudio } from "./components/prompt/PromptStudio";
import { catalogCounts, entries, findEntry } from "./catalog/client";
import { hasActiveFilters, searchEntries, type SearchFilters } from "./lib/search";
import { entryTypeOf } from "./catalog/types";
import {
  addIds,
  loadSelection,
  moveById as moveSelectionId,
  saveSelection,
  toggleId,
} from "./lib/selection";
import { ThemePicker } from "./theme/ThemePicker";
import "./components/browser/browser.css";
import "./components/browser/preview.css";
import "./components/gallery/gallery.css";
import "./components/preview/preview.css";
import "./components/prompt/prompt.css";

type View = "browser" | "gallery" | "prompt" | "preview";

/** M6.2: the preview workspace (vendored showcases + animation engines) is a
 * heavy view, so it loads lazily — browser/gallery users never pay for it. */
const PreviewWorkspace = lazy(() =>
  import("./components/preview/PreviewWorkspace").then((module) => ({ default: module.PreviewWorkspace })),
);

/** Deep links look like `#/component/<id>` (M4), `#/gallery` (M5.3),
 * `#/preview/<id>` (M6.2), and `#/prompt` (M5.4). */
function entryIdFromHash(): string | null {
  const match = /#\/component\/([a-z0-9-]+)/.exec(window.location.hash);
  return match ? match[1] : null;
}

function previewIdFromHash(): string | null {
  const match = /#\/preview\/([a-z0-9-]+)/.exec(window.location.hash);
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
  const [view, setView] = useState<View>("browser");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [theme, setTheme] = useState("");
  const [aesthetic, setAesthetic] = useState("");
  const [source, setSource] = useState("");
  const [entryType, setEntryType] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selection, setSelection] = useState<string[]>(() =>
    loadSelection(new Set(entries.map((entry) => entry.id))),
  );
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
    // Hash deep links: honor #/component/<id>, #/gallery, and #/prompt, and
    // keep back/forward in sync. Filters and the selection survive view
    // switches because both live in this shell (M5.4).
    const syncFromHash = () => {
      const id = entryIdFromHash();
      if (id && findEntry(id)) {
        setView("browser");
        setSelectedId(id);
        return;
      }
      const previewId = previewIdFromHash();
      if (previewId) {
        setView("preview");
        setSelectedId(findEntry(previewId) ? previewId : null);
        return;
      }
      if (window.location.hash === "#/gallery") {
        setView("gallery");
        return;
      }
      if (window.location.hash === "#/prompt") {
        setView("prompt");
        return;
      }
      setView("browser");
      setSelectedId(null);
    };
    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, []);

  useEffect(() => {
    // Persist the selection (pruned ids from a stale payload stay pruned).
    saveSelection(selection);
  }, [selection]);

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

  function openPrompt() {
    window.location.hash = "/prompt";
    setView("prompt");
  }

  function toggleSelection(id: string, next: boolean) {
    setSelection((prev) => (next ? toggleId(prev, id) : prev.filter((candidate) => candidate !== id)));
  }

  function selectAllVisible() {
    setSelection((prev) => addIds(prev, filtered.map((entry) => entry.id)));
  }

  function moveSelection(id: string, delta: -1 | 1) {
    setSelection((prev) => moveSelectionId(prev, id, delta));
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
          {localCount} local · {externalCount} external · {selection.length} selected
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
              selectedIds={selection}
              selectionItems={selection
                .map((id) => findEntry(id))
                .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))}
              onToggleSelect={toggleSelection}
              onSelectAllVisible={selectAllVisible}
              onRemoveSelection={(id) => toggleSelection(id, false)}
              onMoveSelection={moveSelection}
              onClearSelection={() => setSelection([])}
              onGeneratePrompt={openPrompt}
            />
          </>
        ) : view === "preview" ? (
          <Suspense
            fallback={
              <main className="workspace-empty" data-testid="preview-loading" aria-label="Preview workspace">
                Loading preview…
              </main>
            }
          >
            <PreviewWorkspace
              entry={selected}
              selected={selected ? selection.includes(selected.id) : undefined}
              onToggleSelection={toggleSelection}
            />
          </Suspense>
        ) : view === "prompt" ? (
          <PromptStudio
            items={selection
              .map((id) => findEntry(id))
              .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))}
            onBack={() => {
              window.location.hash = "/gallery";
              setView("gallery");
            }}
          />
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
              <DetailPane
                entry={selected}
                selected={selected ? selection.includes(selected.id) : undefined}
                onToggleSelection={toggleSelection}
              />
              {selected ? (
                <p className="workspace-open-row">
                  <a className="workspace-open" href={`#/preview/${selected.id}`}>
                    Open full preview workspace ↗
                  </a>
                </p>
              ) : null}
              <PreviewPanel entry={selected} />
            </section>
          </>
        )}
      </main>
    </div>
  );
}
