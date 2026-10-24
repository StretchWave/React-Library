import { describe, expect, it } from "vitest";
import type { ThemeDoc } from "../catalog/types";
import {
  AUTO_THEME_ID,
  isExplicitThemeId,
  nextThemeId,
  resolveThemeId,
} from "./theme";

const light1: ThemeDoc = { id: "l1", label: "Light 1", base: "light", description: "", tokens: {} };
const dark1: ThemeDoc = { id: "d1", label: "Dark 1", base: "dark", description: "", tokens: {} };
const light2: ThemeDoc = { id: "l2", label: "Light 2", base: "light", description: "", tokens: {} };
const THEMES = [light1, dark1, light2];

describe("resolveThemeId", () => {
  it("auto follows prefers-color-scheme (light first in light mode)", () => {
    expect(resolveThemeId(AUTO_THEME_ID, THEMES, false)).toBe(light1);
    expect(resolveThemeId(AUTO_THEME_ID, THEMES, true)).toBe(dark1);
  });

  it("invalid ids fall back like auto", () => {
    expect(resolveThemeId("extinct-theme", THEMES, false)).toBe(light1);
    expect(resolveThemeId("extinct-theme", THEMES, true)).toBe(dark1);
  });

  it("explicit ids win over system preference", () => {
    expect(resolveThemeId("l2", THEMES, true)).toBe(light2);
  });
});

describe("nextThemeId", () => {
  it("cycles forward through explicit theme ids", () => {
    expect(nextThemeId("l1", THEMES, 1)).toBe(dark1);
    expect(nextThemeId("l2", THEMES, 1)).toBe(light1);
  });

  it("cycles backward", () => {
    expect(nextThemeId("l1", THEMES, -1)).toBe(light2);
  });

  it("starts from the first theme when current is auto", () => {
    expect(nextThemeId(AUTO_THEME_ID, THEMES, 1)).toBe(light1);
  });
});

describe("isExplicitThemeId", () => {
  it("treats auto and unknown ids as non-explicit", () => {
    expect(isExplicitThemeId(AUTO_THEME_ID, THEMES)).toBe(false);
    expect(isExplicitThemeId("d1", THEMES)).toBe(true);
    expect(isExplicitThemeId("extinct", THEMES)).toBe(false);
  });
});
