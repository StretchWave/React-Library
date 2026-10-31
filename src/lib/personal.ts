// Local-first personal data: favorites, named collections, recently viewed,
// saved filters, manual tags, notes and local confirmations. Nothing here is
// written back to the canonical catalog; source re-syncs cannot destroy these
// preferences. All readers sanitize stored JSON and fall back to empty state.
import type { SearchFilters } from "./search";

export const FAVORITES_STORAGE_KEY = "rl.favorites.v3";
export const COLLECTIONS_STORAGE_KEY = "rl.collections.v3";
export const RECENT_STORAGE_KEY = "rl.recent.v3";
export const ANNOTATIONS_STORAGE_KEY = "rl.annotations.v3";
export const SAVED_FILTERS_STORAGE_KEY = "rl.savedFilters.v3";
export const RECENT_LIMIT = 12;
export const COLLECTION_NAME_LIMIT = 60;
export const NOTE_LIMIT = 2000;

export interface Collection {
  id: string;
  name: string;
  ids: string[];
  createdAt: string;
  updatedAt: string;
}

export interface EntryAnnotation {
  manualTags: string[];
  note: string;
  confirmed: boolean;
  updatedAt?: string;
}

export type AnnotationMap = Record<string, EntryAnnotation>;

export interface SavedFilter {
  id: string;
  name: string;
  query: string;
  filters: SearchFilters;
  createdAt: string;
}

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function storageOrNull(): StorageLike | null {
  try {
    if (typeof window !== "undefined" && window.localStorage) return window.localStorage;
  } catch {
    // Security/privacy settings can throw on access.
  }
  return null;
}

function readJson<T>(key: string, fallback: T, storage: StorageLike | null = storageOrNull()): T {
  if (!storage) return fallback;
  try {
    const raw = storage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown, storage: StorageLike | null = storageOrNull()): void {
  if (!storage) return;
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    // Quota or private-mode failure must never break the gallery.
  }
}

function uniqueStrings(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  return [...new Set(values.filter((value): value is string => typeof value === "string" && value.trim() !== ""))];
}

function now(): string {
  return new Date().toISOString();
}

export function loadFavorites(storage?: StorageLike | null): string[] {
  return uniqueStrings(readJson<unknown>(FAVORITES_STORAGE_KEY, [], storage));
}

export function saveFavorites(ids: string[], storage?: StorageLike | null): void {
  writeJson(FAVORITES_STORAGE_KEY, uniqueStrings(ids), storage);
}

export function toggleFavorite(ids: string[], id: string): string[] {
  return ids.includes(id) ? ids.filter((value) => value !== id) : [...ids, id];
}

export function loadRecent(storage?: StorageLike | null): string[] {
  return uniqueStrings(readJson<unknown>(RECENT_STORAGE_KEY, [], storage)).slice(0, RECENT_LIMIT);
}

export function recordRecent(ids: string[], id: string): string[] {
  return [id, ...ids.filter((value) => value !== id)].slice(0, RECENT_LIMIT);
}

export function saveRecent(ids: string[], storage?: StorageLike | null): void {
  writeJson(RECENT_STORAGE_KEY, uniqueStrings(ids).slice(0, RECENT_LIMIT), storage);
}

export function sanitizeCollections(value: unknown): Collection[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const result: Collection[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const collection = item as Partial<Collection>;
    if (typeof collection.id !== "string" || !collection.id.trim()) continue;
    if (typeof collection.name !== "string" || !collection.name.trim()) continue;
    if (seen.has(collection.id)) continue;
    seen.add(collection.id);
    result.push({
      id: collection.id,
      name: collection.name.trim().slice(0, COLLECTION_NAME_LIMIT),
      ids: uniqueStrings(collection.ids),
      createdAt: typeof collection.createdAt === "string" ? collection.createdAt : now(),
      updatedAt: typeof collection.updatedAt === "string" ? collection.updatedAt : now(),
    });
  }
  return result;
}

export function loadCollections(storage?: StorageLike | null): Collection[] {
  return sanitizeCollections(readJson<unknown>(COLLECTIONS_STORAGE_KEY, [], storage));
}

export function saveCollections(collections: Collection[], storage?: StorageLike | null): void {
  writeJson(COLLECTIONS_STORAGE_KEY, sanitizeCollections(collections), storage);
}

export function createCollection(name: string, ids: string[] = []): Collection {
  const timestamp = now();
  return {
    id: `collection-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    name: name.trim().slice(0, COLLECTION_NAME_LIMIT),
    ids: uniqueStrings(ids),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function addToCollection(collections: Collection[], collectionId: string, ids: string[]): Collection[] {
  return collections.map((collection) =>
    collection.id === collectionId
      ? { ...collection, ids: uniqueStrings([...collection.ids, ...ids]), updatedAt: now() }
      : collection,
  );
}

export function removeFromCollection(collections: Collection[], collectionId: string, ids: string[]): Collection[] {
  const removal = new Set(ids);
  return collections.map((collection) =>
    collection.id === collectionId
      ? { ...collection, ids: collection.ids.filter((id) => !removal.has(id)), updatedAt: now() }
      : collection,
  );
}

export function deleteCollection(collections: Collection[], collectionId: string): Collection[] {
  return collections.filter((collection) => collection.id !== collectionId);
}

export function renameCollection(collections: Collection[], collectionId: string, name: string): Collection[] {
  const nextName = name.trim().slice(0, COLLECTION_NAME_LIMIT);
  if (!nextName) return collections;
  return collections.map((collection) =>
    collection.id === collectionId ? { ...collection, name: nextName, updatedAt: now() } : collection,
  );
}

export function sanitizeAnnotations(value: unknown): AnnotationMap {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const result: AnnotationMap = {};
  for (const [id, raw] of Object.entries(value as Record<string, unknown>)) {
    if (!raw || typeof raw !== "object") continue;
    const annotation = raw as Partial<EntryAnnotation>;
    result[id] = {
      manualTags: [
        ...new Set(
          uniqueStrings(annotation.manualTags)
            .map((tag) => tag.toLowerCase().trim())
            .filter(Boolean),
        ),
      ],
      note: typeof annotation.note === "string" ? annotation.note.slice(0, NOTE_LIMIT) : "",
      confirmed: annotation.confirmed === true,
      updatedAt: typeof annotation.updatedAt === "string" ? annotation.updatedAt : undefined,
    };
  }
  return result;
}

export function loadAnnotations(storage?: StorageLike | null): AnnotationMap {
  return sanitizeAnnotations(readJson<unknown>(ANNOTATIONS_STORAGE_KEY, {}, storage));
}

export function saveAnnotations(annotations: AnnotationMap, storage?: StorageLike | null): void {
  writeJson(ANNOTATIONS_STORAGE_KEY, sanitizeAnnotations(annotations), storage);
}

export function annotationFor(annotations: AnnotationMap, id: string): EntryAnnotation {
  return annotations[id] ?? { manualTags: [], note: "", confirmed: false };
}

export function addManualTag(annotations: AnnotationMap, id: string, tag: string): AnnotationMap {
  const clean = tag.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
  if (!clean) return annotations;
  const current = annotationFor(annotations, id);
  return {
    ...annotations,
    [id]: {
      ...current,
      manualTags: uniqueStrings([...current.manualTags, clean]),
      updatedAt: now(),
    },
  };
}

export function removeManualTag(annotations: AnnotationMap, id: string, tag: string): AnnotationMap {
  const current = annotationFor(annotations, id);
  return {
    ...annotations,
    [id]: {
      ...current,
      manualTags: current.manualTags.filter((value) => value !== tag),
      updatedAt: now(),
    },
  };
}

export function setAnnotationNote(annotations: AnnotationMap, id: string, note: string): AnnotationMap {
  const current = annotationFor(annotations, id);
  return {
    ...annotations,
    [id]: { ...current, note: note.slice(0, NOTE_LIMIT), updatedAt: now() },
  };
}

export function setAnnotationConfirmed(annotations: AnnotationMap, id: string, confirmed: boolean): AnnotationMap {
  const current = annotationFor(annotations, id);
  return {
    ...annotations,
    [id]: { ...current, confirmed, updatedAt: now() },
  };
}

export function sanitizeSavedFilters(value: unknown): SavedFilter[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const result: SavedFilter[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const saved = item as Partial<SavedFilter>;
    if (typeof saved.id !== "string" || !saved.id || seen.has(saved.id)) continue;
    if (typeof saved.name !== "string" || !saved.name.trim()) continue;
    if (!saved.filters || typeof saved.filters !== "object" || Array.isArray(saved.filters)) continue;
    seen.add(saved.id);
    result.push({
      id: saved.id,
      name: saved.name.trim().slice(0, COLLECTION_NAME_LIMIT),
      query: typeof saved.query === "string" ? saved.query : "",
      filters: saved.filters,
      createdAt: typeof saved.createdAt === "string" ? saved.createdAt : now(),
    });
  }
  return result;
}

export function loadSavedFilters(storage?: StorageLike | null): SavedFilter[] {
  return sanitizeSavedFilters(readJson<unknown>(SAVED_FILTERS_STORAGE_KEY, [], storage));
}

export function saveSavedFilters(filters: SavedFilter[], storage?: StorageLike | null): void {
  writeJson(SAVED_FILTERS_STORAGE_KEY, sanitizeSavedFilters(filters), storage);
}

export function createSavedFilter(name: string, query: string, filters: SearchFilters): SavedFilter {
  return {
    id: `filter-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    name: name.trim().slice(0, COLLECTION_NAME_LIMIT),
    query,
    filters,
    createdAt: now(),
  };
}

export function removeSavedFilter(filters: SavedFilter[], id: string): SavedFilter[] {
  return filters.filter((filter) => filter.id !== id);
}
