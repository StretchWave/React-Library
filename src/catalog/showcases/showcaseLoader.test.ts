// The loader must resolve an entry without importing unrelated groups. Group
// modules contain descriptor code only; the vendored implementation is a
// separate lazy chunk inside each showcase.
import { describe, expect, it } from "vitest";
import {
  SHOWCASE_IDS,
  loadShowcase,
  loadedShowcaseGroups,
  peekShowcase,
} from "./index";

describe("showcase loader", () => {
  it("loads only the requested group", async () => {
    expect(loadedShowcaseGroups()).not.toContain("webgl");
    const shiny = await loadShowcase("react-bits-shiny-text");
    expect(shiny?.id).toBe("react-bits-shiny-text");
    expect(shiny?.Component).toBeTypeOf("function");
    expect(loadedShowcaseGroups()).toContain("text");
    expect(loadedShowcaseGroups()).not.toContain("webgl");
    expect(loadedShowcaseGroups()).not.toContain("sections");
  });

  it("loads a WebGL entry without pulling unrelated groups", async () => {
    const aurora = await loadShowcase("react-bits-aurora");
    expect(aurora?.id).toBe("react-bits-aurora");
    expect(aurora?.heavy).toBe(true);
    expect(loadedShowcaseGroups()).toContain("webgl");
  });

  it("keeps seeded demos and external records honest", async () => {
    expect(peekShowcase("button")?.id).toBe("button");
    expect(await loadShowcase("shadcn-accordion")).toBeUndefined();
    expect(new Set(SHOWCASE_IDS).size).toBe(SHOWCASE_IDS.length);
  });
});
