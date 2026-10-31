// Local-first persistence tests. Every reader sanitizes stored JSON; personal
// data is keyed by catalog id and never written back to the catalog.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ANNOTATIONS_STORAGE_KEY,
  COLLECTION_NAME_LIMIT,
  COLLECTIONS_STORAGE_KEY,
  FAVORITES_STORAGE_KEY,
  NOTE_LIMIT,
  RECENT_LIMIT,
  RECENT_STORAGE_KEY,
  SAVED_FILTERS_STORAGE_KEY,
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
  removeSavedFilter,
  renameCollection,
  sanitizeAnnotations,
  sanitizeCollections,
  sanitizeSavedFilters,
  saveAnnotations,
  saveCollections,
  saveFavorites,
  saveRecent,
  saveSavedFilters,
  setAnnotationConfirmed,
  setAnnotationNote,
  toggleFavorite,
} from "./personal";

class MemoryStorage {
  private values = new Map<string, string>();
  failWrites = false;

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    if (this.failWrites) throw new Error("quota");
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }
}

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-29T12:00:00.000Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("favorites and recents", () => {
  it("loads sanitized favorites and saves unique ids", () => {
    const storage = new MemoryStorage();
    storage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(["button", "", 7, "button", "card"]));
    expect(loadFavorites(storage)).toEqual(["button", "card"]);
    expect(loadFavorites(null)).toEqual([]);

    saveFavorites(["card", "card", "button"], storage);
    expect(loadFavorites(storage)).toEqual(["card", "button"]);
    expect(toggleFavorite(["card"], "card")).toEqual([]);
    expect(toggleFavorite([], "button")).toEqual(["button"]);
  });

  it("falls back safely on corrupt or unavailable storage", () => {
    const storage = new MemoryStorage();
    storage.setItem(FAVORITES_STORAGE_KEY, "{not json");
    expect(loadFavorites(storage)).toEqual([]);
    storage.failWrites = true;
    expect(() => saveFavorites(["button"], storage)).not.toThrow();
    expect(() => saveRecent(["button"], storage)).not.toThrow();
  });

  it("deduplicates recents, moves revisited ids to the front, and caps length", () => {
    let recent: string[] = [];
    for (let index = 0; index < RECENT_LIMIT + 3; index += 1) {
      recent = recordRecent(recent, `entry-${index}`);
    }
    expect(recent).toHaveLength(RECENT_LIMIT);
    expect(recent[0]).toBe(`entry-${RECENT_LIMIT + 2}`);
    expect(recent.at(-1)).toBe("entry-3");
    recent = recordRecent(recent, "entry-3");
    expect(recent[0]).toBe("entry-3");
    expect(new Set(recent).size).toBe(recent.length);

    const storage = new MemoryStorage();
    saveRecent(recent, storage);
    expect(loadRecent(storage)).toEqual(recent);
    storage.setItem(RECENT_STORAGE_KEY, JSON.stringify(["a", "b", "a"]));
    expect(loadRecent(storage)).toEqual(["a", "b"]);
  });
});

describe("collections", () => {
  it("sanitizes malformed collections, duplicate ids, names and member ids", () => {
    const value = [
      null,
      { id: "", name: "No id" },
      { id: "one", name: "  Hero  ", ids: ["button", "", "button", 3] },
      { id: "one", name: "Duplicate" },
      { id: "two", name: "x".repeat(COLLECTION_NAME_LIMIT + 20), ids: "not-array" },
      { id: "three", name: "" },
    ];
    const collections = sanitizeCollections(value);
    expect(collections).toHaveLength(2);
    expect(collections[0]).toMatchObject({
      id: "one",
      name: "Hero",
      ids: ["button"],
      createdAt: "2026-10-29T12:00:00.000Z",
      updatedAt: "2026-10-29T12:00:00.000Z",
    });
    expect(collections[1].name).toHaveLength(COLLECTION_NAME_LIMIT);
    expect(collections[1].ids).toEqual([]);
  });

  it("creates, renames, adds, removes and deletes collections", () => {
    const collection = createCollection("  Hero  ", ["button", "button"]);
    expect(collection.name).toBe("Hero");
    expect(collection.ids).toEqual(["button"]);
    expect(collection.id.startsWith("collection-")).toBe(true);
    expect(collection.createdAt).toBe("2026-10-29T12:00:00.000Z");

    const added = addToCollection([collection], collection.id, ["card", "button"]);
    expect(added[0].ids).toEqual(["button", "card"]);
    expect(added[0].updatedAt).toBe("2026-10-29T12:00:00.000Z");

    const removed = removeFromCollection(added, collection.id, ["button"]);
    expect(removed[0].ids).toEqual(["card"]);

    const renamed = renameCollection(removed, collection.id, "Landing");
    expect(renamed[0].name).toBe("Landing");
    expect(renameCollection(renamed, collection.id, "   ")).toBe(renamed);
    expect(deleteCollection(renamed, collection.id)).toEqual([]);
  });

  it("round-trips collections and ignores malformed stored data", () => {
    const storage = new MemoryStorage();
    const collection = createCollection("Hero", ["button"]);
    saveCollections([collection], storage);
    expect(loadCollections(storage)).toEqual([collection]);
    storage.setItem(COLLECTIONS_STORAGE_KEY, "[]");
    expect(loadCollections(storage)).toEqual([]);
    storage.setItem(COLLECTIONS_STORAGE_KEY, "{}");
    expect(loadCollections(storage)).toEqual([]);
  });
});

describe("annotations", () => {
  it("normalizes manual tags and caps notes", () => {
    let annotations = addManualTag({}, "button", "  Hero CTA!  ");
    annotations = addManualTag(annotations, "button", "hero-cta");
    annotations = addManualTag(annotations, "button", "!!!");
    expect(annotations.button.manualTags).toEqual(["hero-cta"]);
    expect(annotationFor(annotations, "button").updatedAt).toBe("2026-10-29T12:00:00.000Z");

    annotations = setAnnotationNote(annotations, "button", "n".repeat(NOTE_LIMIT + 20));
    expect(annotations.button.note).toHaveLength(NOTE_LIMIT);
    annotations = setAnnotationConfirmed(annotations, "button", true);
    expect(annotations.button.confirmed).toBe(true);
    annotations = removeManualTag(annotations, "button", "hero-cta");
    expect(annotations.button.manualTags).toEqual([]);
    expect(annotationFor(annotations, "missing")).toEqual({
      manualTags: [],
      note: "",
      confirmed: false,
    });
  });

  it("sanitizes stored annotations and round-trips them", () => {
    expect(
      sanitizeAnnotations({
        button: { manualTags: ["Hero", "hero", "", 4], note: "Use me", confirmed: "yes" },
        broken: null,
        other: { manualTags: "no", note: 3 },
      }),
    ).toEqual({
      button: { manualTags: ["hero"], note: "Use me", confirmed: false, updatedAt: undefined },
      other: { manualTags: [], note: "", confirmed: false, updatedAt: undefined },
    });
    expect(sanitizeAnnotations(null)).toEqual({});
    expect(sanitizeAnnotations([])).toEqual({});

    const storage = new MemoryStorage();
    const annotations = setAnnotationNote({}, "button", "Hero note");
    saveAnnotations(annotations, storage);
    expect(loadAnnotations(storage)).toEqual(annotations);
    storage.setItem(ANNOTATIONS_STORAGE_KEY, "{bad");
    expect(loadAnnotations(storage)).toEqual({});
  });
});

describe("saved filters", () => {
  it("sanitizes duplicate ids, invalid filters and names", () => {
    const filters = sanitizeSavedFilters([
      null,
      { id: "", name: "No id", filters: {} },
      { id: "one", name: "  Buttons  ", query: "button", filters: { type: ["button"] } },
      { id: "one", name: "Duplicate", filters: {} },
      { id: "two", name: "Bad filters", filters: [] },
      { id: "three", name: "", filters: {} },
      { id: "four", name: "Minimal", filters: { vibe: "minimal" } },
    ]);
    expect(filters.map((filter) => filter.id)).toEqual(["one", "four"]);
    expect(filters[0]).toMatchObject({
      name: "Buttons",
      query: "button",
      filters: { type: ["button"] },
      createdAt: "2026-10-29T12:00:00.000Z",
    });
  });

  it("creates, removes and persists saved filters", () => {
    const saved = createSavedFilter("  Hero buttons  ", "button", { type: ["button"] });
    expect(saved.name).toBe("Hero buttons");
    expect(saved.id.startsWith("filter-")).toBe(true);
    expect(removeSavedFilter([saved], saved.id)).toEqual([]);

    const storage = new MemoryStorage();
    saveSavedFilters([saved], storage);
    expect(loadSavedFilters(storage)).toEqual([saved]);
    storage.setItem(SAVED_FILTERS_STORAGE_KEY, "not-json");
    expect(loadSavedFilters(storage)).toEqual([]);
  });
});
