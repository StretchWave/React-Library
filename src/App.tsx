// App shell (schema v3 discovery workspace). Browse is the default visual wall;
// Collections, Sources and Selected for AI are first-class views. URL hash owns
// shareable filter state, while personal data stays in localStorage. The
// canonical catalog remains the only source of component truth.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DetailPane } from "./components/browser/DetailPane";
import { EntryList } from "./components/browser/EntryList";
import { PreviewPanel } from "./components/browser/PreviewPanel";
import { FacetSidebar, type FacetKey } from "./components/browse/FacetSidebar";
import { CollectionsView } from "./components/collections/CollectionsView";
import { CompareDialog } from "./components/compare/CompareDialog";
import { Gallery } from "./components/gallery/Gallery";
import { InspectorPanel } from "./components/inspector/InspectorPanel";
import { ExpandedPreview } from "./components/preview/ExpandedPreview";
import { SelectedView } from "./components/selected/SelectedView";
import { SourcesView } from "./components/sources/SourcesView";
import {
  aestheticById,
  attributeById,
  categoryById,
  catalogCounts,
  componentTypeById,
  entries,
  findEntry,
  sourceById,
  sources,
  techniqueById,
  triggerById,
} from "./catalog/client";
import type { CatalogEntry } from "./catalog/types";
import { entryTypeOf } from "./catalog/types";
import { hasActiveFilters, searchEntries, valuesOf, type SearchFilters } from "./lib/search";
import {
  addIds,
  loadSelection,
  moveById as moveSelectionId,
  saveSelection,
  toggleId,
} from "./lib/selection";
import {
  addManualTag,
  addToCollection,
  annotationFor,
  createCollection,
  createSavedFilter,
  deleteCollection,
  loadAnnotations,
  loadCollections,
  loadFavorites,
  loadRecent,
  loadSavedFilters,
  recordRecent,
  removeFromCollection,
  removeManualTag,
  saveAnnotations,
  saveCollections,
  saveFavorites,
  saveRecent,
  saveSavedFilters,
  setAnnotationConfirmed,
  setAnnotationNote,
  toggleFavorite,
  type Collection,
  type SavedFilter,
} from "./lib/personal";
import { buildHash, parseHash, type AppView, type RouteState } from "./lib/routing";
import { ThemePicker } from "./theme/ThemePicker";
import "./components/browser/browser.css";
import "./components/browser/preview.css";
import "./components/gallery/gallery.css";
import "./components/preview/preview.css";
import "./components/prompt/prompt.css";
import "./styles/discovery.css";

type View = AppView;

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT" ||
    target.isContentEditable
  );
}

function routeFromLocation(): RouteState {
  return parseHash(typeof window === "undefined" ? "" : window.location.hash);
}

const FACET_FILTERS: Record<FacetKey, keyof SearchFilters> = {
  types: "type",
  triggers: "trigger",
  techniques: "technique",
  vibe: "vibe",
  tech: "tech",
  source: "source",
  previewMode: "previewMode",
  entryType: "entryType",
  category: "category",
};

const PREVIEW_LABELS: Record<string, string> = {
  live: "Live preview",
  snapshot: "Snapshot",
  loop: "Captured loop",
  external: "External reference",
  unavailable: "Unavailable",
};

function facetLabel(key: FacetKey, value: string): string {
  if (key === "types") return componentTypeById(value)?.label ?? value;
  if (key === "triggers") return triggerById(value)?.label ?? value;
  if (key === "techniques") return techniqueById(value)?.label ?? value;
  if (key === "vibe") return aestheticById(value)?.label ?? value;
  if (key === "tech") return attributeById(value)?.label ?? value;
  if (key === "source") return value === "built-in" ? "Built-in" : sourceById(value)?.name ?? value;
  if (key === "category") return categoryById(value)?.label ?? value;
  if (key === "previewMode") return PREVIEW_LABELS[value] ?? value;
  if (key === "entryType") return value === "local" ? "Usable locally" : "Reference only";
  return value;
}

export default function App() {
  const initialRoute = useMemo(routeFromLocation, []);
  const [view, setView] = useState<View>(initialRoute.view);
  const [query, setQuery] = useState(initialRoute.query);
  const [filters, setFilters] = useState<SearchFilters>(initialRoute.filters);
  const [facetsCollapsed, setFacetsCollapsed] = useState(false);
  const [mobileFilters, setMobileFilters] = useState(Boolean(initialRoute.mobileFilters));
  const [inspectorId, setInspectorId] = useState<string | null>(
    initialRoute.componentId && findEntry(initialRoute.componentId) ? initialRoute.componentId : null,
  );
  const [expandedId, setExpandedId] = useState<string | null>(
    initialRoute.expandedId && findEntry(initialRoute.expandedId) ? initialRoute.expandedId : null,
  );
  const [collectionId, setCollectionId] = useState<string | undefined>(initialRoute.collectionId);
  const [sourceId, setSourceId] = useState<string | undefined>(initialRoute.sourceId);
  const [browserSelectedId, setBrowserSelectedId] = useState<string | null>(
    initialRoute.view === "browser" && initialRoute.componentId && findEntry(initialRoute.componentId)
      ? initialRoute.componentId
      : null,
  );
  const [promptFocus, setPromptFocus] = useState(Boolean(initialRoute.promptFocus));
  const [compareOpen, setCompareOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const [selection, setSelection] = useState<string[]>(() =>
    loadSelection(new Set(entries.map((entry) => entry.id))),
  );
  const [favoriteIds, setFavoriteIds] = useState<string[]>(loadFavorites);
  const [recentIds, setRecentIds] = useState<string[]>(loadRecent);
  const [collections, setCollections] = useState<Collection[]>(loadCollections);
  const [annotations, setAnnotations] = useState(loadAnnotations);
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>(loadSavedFilters);

  useEffect(() => saveSelection(selection), [selection]);
  useEffect(() => saveFavorites(favoriteIds), [favoriteIds]);
  useEffect(() => saveRecent(recentIds), [recentIds]);
  useEffect(() => saveCollections(collections), [collections]);
  useEffect(() => saveAnnotations(annotations), [annotations]);
  useEffect(() => saveSavedFilters(savedFilters), [savedFilters]);

  const applyRoute = useCallback((route: RouteState) => {
    setView(route.view);
    setCollectionId(route.collectionId);
    setSourceId(route.sourceId);
    setPromptFocus(Boolean(route.promptFocus));
    if (route.view === "browse") {
      setQuery(route.query);
      setFilters(route.filters);
      setInspectorId(route.componentId && findEntry(route.componentId) ? route.componentId : null);
      setExpandedId(route.expandedId && findEntry(route.expandedId) ? route.expandedId : null);
    } else if (route.view === "browser") {
      setInspectorId(route.componentId && findEntry(route.componentId) ? route.componentId : null);
      setExpandedId(null);
      if (route.componentId && findEntry(route.componentId)) setBrowserSelectedId(route.componentId);
    } else {
      setInspectorId(null);
      setExpandedId(null);
    }
    if (route.mobileFilters) setMobileFilters(true);
  }, []);

  useEffect(() => {
    const onRouteChange = () => applyRoute(routeFromLocation());
    window.addEventListener("hashchange", onRouteChange);
    window.addEventListener("popstate", onRouteChange);
    return () => {
      window.removeEventListener("hashchange", onRouteChange);
      window.removeEventListener("popstate", onRouteChange);
    };
  }, [applyRoute]);

  // Keep browse filters shareable without polluting history on every keystroke.
  useEffect(() => {
    if (view !== "browse" || inspectorId || expandedId || mobileFilters) return;
    const next = buildHash("browse", filters, query);
    if (window.location.hash !== next) window.history.replaceState(null, "", next);
  }, [view, filters, query, inspectorId, expandedId, mobileFilters]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "/" && !isEditableTarget(event.target)) {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
      if (event.key === "Escape" && mobileFilters) setMobileFilters(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileFilters]);

  useEffect(() => {
    if (view === "selected" && promptFocus) {
      const timer = window.setTimeout(() => {
        document.querySelector(".prompt-studio")?.scrollIntoView?.({ behavior: "smooth", block: "start" });
        setPromptFocus(false);
      }, 60);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [view, promptFocus]);

  const navigate = useCallback(
    (nextView: View, options: { collectionId?: string; sourceId?: string; promptFocus?: boolean } = {}) => {
      setView(nextView);
      setMobileFilters(false);
      setCompareOpen(false);
      setInspectorId(null);
      setExpandedId(null);
      setPromptFocus(Boolean(options.promptFocus));
      if (nextView === "collections") setCollectionId(options.collectionId);
      if (nextView === "sources") setSourceId(options.sourceId);
      if (nextView !== "collections") setCollectionId(undefined);
      if (nextView !== "sources") setSourceId(undefined);
      const hash = buildHash(nextView, filters, query, {
        collectionId: options.collectionId ?? null,
        sourceId: options.sourceId ?? null,
        promptFocus: options.promptFocus,
      });
      if (window.location.hash !== hash) window.location.hash = hash;
    },
    [filters, query],
  );

  const openBrowse = useCallback(() => navigate("browse"), [navigate]);

  const openInspector = useCallback(
    (id: string) => {
      if (!findEntry(id)) return;
      setExpandedId(null);
      setCompareOpen(false);
      setInspectorId(id);
      setRecentIds((current) => recordRecent(current, id));
      // Browse deep links preserve the discovery context. Collections, Sources,
      // Selected and Table keep their own route and open the inspector locally.
      if (view === "browse") {
        const hash = buildHash("browse", filters, query, { componentId: id });
        if (window.location.hash !== hash) window.location.hash = hash;
      }
    },
    [filters, query, view],
  );

  const closeInspector = useCallback(() => {
    setInspectorId(null);
    if (view === "browse") {
      const hash = buildHash("browse", filters, query);
      if (window.location.hash !== hash) window.history.replaceState(null, "", hash);
    }
  }, [filters, query, view]);

  const openExpanded = useCallback(
    (id: string) => {
      if (!findEntry(id)) return;
      setInspectorId(null);
      setCompareOpen(false);
      setExpandedId(id);
      setRecentIds((current) => recordRecent(current, id));
      if (view === "browse") {
        const hash = buildHash("browse", filters, query, { expandedId: id });
        if (window.location.hash !== hash) window.location.hash = hash;
      }
    },
    [filters, query, view],
  );

  const closeExpanded = useCallback(() => {
    setExpandedId(null);
    if (view === "browse") {
      const hash = buildHash("browse", filters, query);
      if (window.location.hash !== hash) window.history.replaceState(null, "", hash);
    }
  }, [filters, query, view]);

  const toggleSelection = useCallback((id: string, next: boolean) => {
    setSelection((previous) => (next ? toggleId(previous, id) : previous.filter((value) => value !== id)));
  }, []);

  const toggleFacet = useCallback((key: FacetKey, value: string) => {
    const filterKey = FACET_FILTERS[key];
    setFilters((current) => {
      const existing = valuesOf(current[filterKey]);
      const next = existing.includes(value)
        ? existing.filter((candidate) => candidate !== value)
        : [...existing, value];
      const updated = { ...current };
      if (next.length === 0) delete updated[filterKey];
      else updated[filterKey] = next;
      return updated;
    });
  }, []);

  const removeFacetChip = useCallback(
    (key: FacetKey, value: string) => toggleFacet(key, value),
    [toggleFacet],
  );

  const resetFilters = useCallback(() => {
    setFilters({});
    setQuery("");
  }, []);

  const applySavedFilter = useCallback((saved: SavedFilter) => {
    setView("browse");
    setQuery(saved.query);
    setFilters(saved.filters);
    setMobileFilters(false);
  }, []);

  const saveCurrentFilter = useCallback(
    (name: string) => {
      setSavedFilters((current) => [createSavedFilter(name, query, filters), ...current]);
    },
    [filters, query],
  );

  const selectionItems = useMemo(
    () =>
      selection
        .map((id) => findEntry(id))
        .filter((entry): entry is CatalogEntry => Boolean(entry)),
    [selection],
  );
  const filtered = useMemo(() => searchEntries(entries, query, filters), [query, filters]);
  const filtersActive = hasActiveFilters(query, filters);
  const selected = inspectorId ? findEntry(inspectorId) ?? null : null;
  const expanded = expandedId ? findEntry(expandedId) ?? null : null;
  const browserSelected = browserSelectedId ? findEntry(browserSelectedId) ?? null : null;
  const annotation = selected ? annotationFor(annotations, selected.id) : undefined;
  const favoriteSet = new Set(favoriteIds);
  const localCount = useMemo(() => entries.filter((entry) => entryTypeOf(entry) === "local").length, []);

  const activeChips = useMemo(() => {
    const chips: Array<{ key: FacetKey; value: string; label: string }> = [];
    (Object.keys(FACET_FILTERS) as FacetKey[]).forEach((key) => {
      const filterKey = FACET_FILTERS[key];
      for (const value of valuesOf(filters[filterKey])) {
        chips.push({ key, value, label: facetLabel(key, value) });
      }
    });
    return chips;
  }, [filters]);

  const allSourcesLabel = `${sources.length} sources`;
  const tableEntry = browserSelected ?? filtered[0] ?? null;

  return (
    <div className={`app-shell view-${view}`}>
      <header className="app-header app-header--discovery">
        <div className="app-heading">
          <span className="app-mark" aria-hidden="true">RL</span>
          <div>
            <h1 className="app-title">React Library</h1>
            <p className="app-tagline">
              Agent-first visual catalog · {catalogCounts.entries} components · {allSourcesLabel}
            </p>
          </div>
        </div>
        <div className="global-search" role="search">
          <label className="visually-hidden" htmlFor="global-search-input">
            Search the entire catalog
          </label>
          <span className="global-search-icon" aria-hidden="true">⌕</span>
          <input
            id="global-search-input"
            ref={searchInputRef}
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              if (view !== "browse") setView("browse");
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape" && query) {
                event.stopPropagation();
                setQuery("");
              }
            }}
            placeholder="Search components, types, triggers, vibes..."
            aria-keyshortcuts="/"
            autoComplete="off"
          />
          {query ? (
            <button type="button" className="global-search-clear" onClick={() => setQuery("")} aria-label="Clear search">
              Clear
            </button>
          ) : (
            <kbd className="global-search-key" aria-hidden="true">/</kbd>
          )}
        </div>
        <div className="app-header-actions">
          <span className="header-stat" title="Local implementations">{localCount} local</span>
          <ThemePicker />
        </div>
      </header>

      <nav className="app-views app-views--discovery" aria-label="Catalog views">
        <div className="view-switcher" role="presentation">
          <button
            type="button"
            className={view === "browse" ? "view-switch is-active" : "view-switch"}
            aria-pressed={view === "browse"}
            onClick={openBrowse}
          >
            Browse
          </button>
          <button
            type="button"
            className={view === "collections" ? "view-switch is-active" : "view-switch"}
            aria-pressed={view === "collections"}
            onClick={() => navigate("collections", { collectionId })}
          >
            Collections
          </button>
          <button
            type="button"
            className={view === "sources" ? "view-switch is-active" : "view-switch"}
            aria-pressed={view === "sources"}
            onClick={() => navigate("sources", { sourceId })}
          >
            Sources
          </button>
          <button
            type="button"
            className={view === "selected" ? "view-switch is-active" : "view-switch"}
            aria-pressed={view === "selected"}
            onClick={() => navigate("selected")}
          >
            Selected for AI
            {selection.length > 0 ? <span className="view-switch-badge">{selection.length}</span> : null}
          </button>
          <button
            type="button"
            className={view === "browser" ? "view-switch is-active" : "view-switch"}
            aria-pressed={view === "browser"}
            onClick={() => navigate("browser")}
          >
            Table
          </button>
        </div>
        <span className="view-counts">
          {filtered.length !== entries.length && view === "browse" ? `${filtered.length} shown · ` : ""}
          {favoriteIds.length} favorites · {selection.length} selected
        </span>
      </nav>

      <main
        className={[
          "app-main",
          "app-main--discovery",
          view === "browser" ? "is-catalog" : "",
          facetsCollapsed ? "is-facets-collapsed" : "",
        ].join(" ")}
      >
        {view === "browse" ? (
          <>
            {mobileFilters ? (
              <button
                type="button"
                className="facet-mobile-backdrop"
                aria-label="Close filters"
                onClick={() => setMobileFilters(false)}
              />
            ) : null}
            <div className="facets-column">
              <div className="facets-desktop-controls">
                <button
                  type="button"
                  className="facets-collapse"
                  aria-expanded={!facetsCollapsed}
                  onClick={() => setFacetsCollapsed((value) => !value)}
                >
                  {facetsCollapsed ? "Show filters" : "Hide filters"}
                </button>
              </div>
              <FacetSidebar
                entries={entries}
                filters={filters}
                onToggleFacet={toggleFacet}
                onClearFilters={resetFilters}
                onClose={() => setMobileFilters(false)}
                savedFilters={savedFilters}
                onApplySavedFilter={applySavedFilter}
                onDeleteSavedFilter={(id) => setSavedFilters((current) => current.filter((item) => item.id !== id))}
                onSaveFilter={saveCurrentFilter}
                mobileOpen={mobileFilters}
              />
            </div>
            <div className="browse-content">
              <div className="browse-toolbar">
                <button
                  type="button"
                  className="browse-filters-mobile"
                  onClick={() => setMobileFilters(true)}
                >
                  Filters{activeChips.length > 0 ? ` (${activeChips.length})` : ""}
                </button>
                <p className="browse-context">
                  {filtersActive
                    ? "Live results across every discovery dimension."
                    : "Every component, classified by type, trigger, technique and vibe."}
                </p>
              </div>
              {activeChips.length > 0 ? (
                <section className="active-filters" aria-label="Active filters">
                  {activeChips.map((chip) => (
                    <button
                      key={`${chip.key}:${chip.value}`}
                      type="button"
                      className="active-filter-chip"
                      onClick={() => removeFacetChip(chip.key, chip.value)}
                      aria-label={`Remove ${chip.label} filter`}
                    >
                      {chip.label}
                      <span aria-hidden="true">×</span>
                    </button>
                  ))}
                  <button type="button" className="active-filters-clear" onClick={resetFilters}>
                    Clear all
                  </button>
                </section>
              ) : null}
              <Gallery
                entries={filtered}
                totalCount={catalogCounts.entries}
                filtersActive={filtersActive}
                onResetFilters={resetFilters}
                selectedIds={selection}
                selectionItems={selectionItems}
                favoriteIds={favoriteIds}
                onToggleSelect={toggleSelection}
                onToggleFavorite={(id) => setFavoriteIds((current) => toggleFavorite(current, id))}
                onOpenEntry={openInspector}
                onExpandEntry={openExpanded}
                onSelectAllVisible={() => setSelection((current) => addIds(current, filtered.map((entry) => entry.id)))}
                onRemoveSelection={(id) => toggleSelection(id, false)}
                onMoveSelection={(id, delta) => setSelection((current) => moveSelectionId(current, id, delta))}
                onClearSelection={() => setSelection([])}
                onGeneratePrompt={() => navigate("selected", { promptFocus: true })}
                onCompare={() => setCompareOpen(true)}
              />
            </div>
          </>
        ) : view === "collections" ? (
          <CollectionsView
            entries={entries}
            collections={collections}
            favoriteIds={favoriteIds}
            recentIds={recentIds}
            focusCollectionId={collectionId}
            onOpenEntry={openInspector}
            onExpandEntry={openExpanded}
            onCreateCollection={(name) => {
              setCollections((current) => [createCollection(name), ...current]);
            }}
            onDeleteCollection={(id) => setCollections((current) => deleteCollection(current, id))}
            onRemoveFromCollection={(id, ids) => setCollections((current) => removeFromCollection(current, id, ids))}
            onToggleFavorite={(id) => setFavoriteIds((current) => toggleFavorite(current, id))}
            onNavigate={(id) => navigate("collections", { collectionId: id })}
          />
        ) : view === "sources" ? (
          <SourcesView
            entries={entries}
            focusSourceId={sourceId}
            onOpenEntry={openInspector}
            onExpandEntry={openExpanded}
            onNavigate={(id) => navigate("sources", { sourceId: id })}
          />
        ) : view === "selected" ? (
          <SelectedView
            items={selectionItems}
            annotations={annotations}
            onBack={openBrowse}
            onOpenEntry={openInspector}
            onExpandEntry={openExpanded}
            onRemove={(id) => toggleSelection(id, false)}
            onMove={(id, delta) => setSelection((current) => moveSelectionId(current, id, delta))}
            onClear={() => setSelection([])}
            onCompare={() => setCompareOpen(true)}
          />
        ) : (
          <>
            <section className="entry-nav" aria-label="Component table">
              <EntryList
                entries={filtered}
                totalCount={catalogCounts.entries}
                selectedId={tableEntry?.id ?? null}
                onSelect={(id) => {
                  setBrowserSelectedId(id);
                  setRecentIds((current) => recordRecent(current, id));
                }}
                filtersActive={filtersActive}
                onResetFilters={resetFilters}
              />
            </section>
            <section className="detail-pane" aria-label="Component details">
              <DetailPane
                entry={tableEntry}
                selected={tableEntry ? selection.includes(tableEntry.id) : undefined}
                onToggleSelection={toggleSelection}
              />
              {tableEntry ? (
                <div className="table-open-actions">
                  <button type="button" onClick={() => openInspector(tableEntry.id)}>Open inspector</button>
                  <button type="button" onClick={() => openExpanded(tableEntry.id)}>Open full preview</button>
                </div>
              ) : null}
              <PreviewPanel entry={tableEntry} />
            </section>
          </>
        )}
      </main>

      {selection.length > 0 && view !== "browse" && view !== "selected" ? (
        <div className="selection-dock" role="status">
          <span>{selection.length} selected for AI</span>
          <button type="button" onClick={() => navigate("selected")}>Open selected</button>
          <button type="button" onClick={() => setSelection([])}>Clear</button>
        </div>
      ) : null}

      {selected && annotation ? (
        <InspectorPanel
          entry={selected}
          selected={selection.includes(selected.id)}
          favorite={favoriteSet.has(selected.id)}
          annotation={annotation}
          collections={collections}
          onClose={closeInspector}
          onToggleSelect={toggleSelection}
          onToggleFavorite={(id) => setFavoriteIds((current) => toggleFavorite(current, id))}
          onExpand={openExpanded}
          onAddToCollection={(id, ids) => setCollections((current) => addToCollection(current, id, ids))}
          onAddManualTag={(id, tag) => setAnnotations((current) => addManualTag(current, id, tag))}
          onRemoveManualTag={(id, tag) => setAnnotations((current) => removeManualTag(current, id, tag))}
          onNoteChange={(id, note) => setAnnotations((current) => setAnnotationNote(current, id, note))}
          onConfirmTags={(id) => setAnnotations((current) => setAnnotationConfirmed(current, id, true))}
        />
      ) : null}

      {expanded ? (
        <ExpandedPreview
          entry={expanded}
          selected={selection.includes(expanded.id)}
          onToggleSelection={toggleSelection}
          onClose={closeExpanded}
        />
      ) : null}

      {compareOpen && selectionItems.length >= 2 ? (
        <CompareDialog
          entries={selectionItems}
          onClose={() => setCompareOpen(false)}
          onOpenEntry={(id) => {
            setCompareOpen(false);
            openInspector(id);
          }}
        />
      ) : null}
    </div>
  );
}
