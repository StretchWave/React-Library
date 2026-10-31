// Pure hash-routing helpers. The URL is the shareable state: browse filters
// serialize into `#/browse?q=...&type=...`; detail overlays use deep-link
// routes (`#/component/:id`, `#/preview/:id`) but normally open as local state
// so opening the inspector never resets the gallery route or scroll.
import type { SearchFilters } from "./search";

export type AppView = "browse" | "collections" | "sources" | "selected" | "browser";

export interface RouteState {
  view: AppView;
  query: string;
  filters: SearchFilters;
  /** Deep-link inspector target (browse view). */
  componentId?: string;
  /** Deep-link expanded-preview target (browse view). */
  expandedId?: string;
  collectionId?: string;
  sourceId?: string;
  promptFocus?: boolean;
  mobileFilters?: boolean;
}

export const FILTER_QUERY_KEYS = [
  "category",
  "type",
  "trigger",
  "technique",
  "vibe",
  "tech",
  "source",
  "entryType",
  "previewMode",
  "status",
] as const;

type FilterKey = (typeof FILTER_QUERY_KEYS)[number];

const SINGLE_VALUES = new Set<string>(["q"]);

function list(value: string | null): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function decodePart(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    return decodeURIComponent(value);
  } catch {
    // A malformed share link must not crash the app; keep the raw segment.
    return value;
  }
}

function parseQuery(query: string): { q: string; filters: SearchFilters } {
  const params = new URLSearchParams(query);
  const filters: SearchFilters = {};
  for (const key of FILTER_QUERY_KEYS) {
    const values = list(params.get(key));
    if (values.length > 0) (filters as Record<string, unknown>)[key] = values;
  }
  return { q: params.get("q") ?? "", filters };
}

export function parseHash(hash: string): RouteState {
  const raw = (hash || "").replace(/^#\/?/, "");
  const [pathPart, query = ""] = raw.split("?");
  const parts = pathPart.split("/").filter(Boolean);
  const head = parts[0] ?? "browse";
  const { q, filters } = parseQuery(query);
  const route: RouteState = { view: "browse", query: q, filters };

  if (head === "collections") {
    route.view = "collections";
    if (parts[1]) route.collectionId = decodePart(parts[1]);
  } else if (head === "sources") {
    route.view = "sources";
    if (parts[1]) route.sourceId = decodePart(parts[1]);
  } else if (head === "selected" || head === "prompt") {
    route.view = "selected";
    route.promptFocus = head === "prompt" || parts[1] === "prompt";
  } else if (head === "browser" || head === "catalog") {
    route.view = "browser";
    if (parts[1]) route.componentId = decodePart(parts[1]);
  } else if (head === "component" || head === "entry") {
    route.view = "browse";
    if (parts[1]) route.componentId = decodePart(parts[1]);
  } else if (head === "preview") {
    route.view = "browse";
    if (parts[1]) route.expandedId = decodePart(parts[1]);
  } else if (head === "filters" || head === "facets") {
    route.view = "browse";
    route.mobileFilters = true;
  } else if (head === "gallery" || head === "browse" || head === "" || head === "index") {
    route.view = "browse";
  } else {
    route.view = "browse";
  }

  if (q) route.query = q;
  return route;
}

export interface HashOptions {
  componentId?: string | null;
  expandedId?: string | null;
  collectionId?: string | null;
  sourceId?: string | null;
  promptFocus?: boolean;
  mobileFilters?: boolean;
}

export function buildHash(
  view: AppView,
  filters: SearchFilters = {},
  query = "",
  options: HashOptions = {},
): string {
  const params = buildParams(filters, query);
  const querySuffix = params ? `?${params}` : "";
  if (options.componentId) return `#/component/${encodeURIComponent(options.componentId)}${querySuffix}`;
  if (options.expandedId) return `#/preview/${encodeURIComponent(options.expandedId)}${querySuffix}`;
  if (options.mobileFilters) {
    return `#/filters${querySuffix}`;
  }
  if (view === "collections") {
    return options.collectionId
      ? `#/collections/${encodeURIComponent(options.collectionId)}`
      : "#/collections";
  }
  if (view === "sources") {
    return options.sourceId ? `#/sources/${encodeURIComponent(options.sourceId)}` : "#/sources";
  }
  if (view === "selected") return options.promptFocus ? "#/prompt" : "#/selected";
  if (view === "browser") return "#/browser";
  return params ? `#/browse?${params}` : "#/browse";
}

function buildParams(filters: SearchFilters, query: string): string {
  const params = new URLSearchParams();
  if (query.trim()) params.set("q", query.trim());
  for (const key of FILTER_QUERY_KEYS) {
    const value = filters[key as keyof SearchFilters];
    const values = Array.isArray(value) ? value : value ? [value] : [];
    if (values.length > 0) params.set(key, values.join(","));
  }
  return params.toString();
}

/** Applies a URL query patch without dropping existing filter values. */
export function filterQueryString(filters: SearchFilters, query: string): string {
  return buildParams(filters, query);
}

export function readFilterQuery(query: string): { q: string; filters: SearchFilters } {
  return parseQuery(query);
}

/** Read-only helper used by tests and share buttons. */
export function routeLabel(route: RouteState): string {
  if (route.view === "browse") return "Browse";
  if (route.view === "collections") return "Collections";
  if (route.view === "sources") return "Sources";
  if (route.view === "selected") return "Selected for AI";
  return "Table";
}

export function isFilterKey(value: string): value is FilterKey {
  return (FILTER_QUERY_KEYS as readonly string[]).includes(value) && !SINGLE_VALUES.has(value);
}
