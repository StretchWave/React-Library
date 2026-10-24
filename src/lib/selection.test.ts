// Selection store tests (M5.4, jsdom localStorage).
import { beforeEach, describe, expect, it } from "vitest";
import {
  SELECTION_STORAGE_KEY,
  addIds,
  loadSelection,
  moveById,
  parseSelection,
  toggleId,
} from "./selection";

const VALID = new Set(["a", "b", "c"]);

beforeEach(() => {
  localStorage.clear();
});

describe("selection store (M5.4)", () => {
  it("toggles ids preserving order", () => {
    expect(toggleId([], "b")).toEqual(["b"]);
    expect(toggleId(["b", "c"], "a")).toEqual(["b", "c", "a"]);
    expect(toggleId(["b", "c"], "b")).toEqual(["c"]);
    expect(toggleId(["c"], "c")).toEqual([]);
  });

  it("moves ids by delta and ignores out-of-range moves", () => {
    expect(moveById(["a", "b", "c"], "b", -1)).toEqual(["b", "a", "c"]);
    expect(moveById(["a", "b", "c"], "b", 1)).toEqual(["a", "c", "b"]);
    expect(moveById(["a", "b", "c"], "a", -1)).toEqual(["a", "b", "c"]);
    expect(moveById(["a", "b", "c"], "c", 1)).toEqual(["a", "b", "c"]);
    expect(moveById([], "ghost", 1)).toEqual([]);
  });

  it("append-order is stable and addIds skips duplicates", () => {
    expect(addIds(["a"], ["b", "a", "c"])).toEqual(["a", "b", "c"]);
    expect(addIds(["a"], [])).toEqual(["a"]);
  });

  it("parses persisted selections and prunes unknown ids", () => {
    expect(parseSelection(JSON.stringify(["b", "ghost", "b", "c"]), VALID)).toEqual(["b", "c"]);
    expect(parseSelection("not json", VALID)).toEqual([]);
    expect(parseSelection(JSON.stringify("a"), VALID)).toEqual([]);
    expect(parseSelection(null, VALID)).toEqual([]);
  });

  it("persists through localStorage with a versioned key", () => {
    localStorage.setItem(SELECTION_STORAGE_KEY, JSON.stringify(["a", "extinct"]));
    expect(loadSelection(VALID)).toEqual(["a"]);
    expect(loadSelection(new Set())).toEqual([]);
  });
});
