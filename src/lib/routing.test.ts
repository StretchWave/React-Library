// Pure hash-routing tests. Share links must round-trip discovery context and
// must never crash on malformed or obsolete route segments.
import { describe, expect, it } from "vitest";
import {
  buildHash,
  filterQueryString,
  isFilterKey,
  parseHash,
  readFilterQuery,
  routeLabel,
} from "./routing";

describe("parseHash", () => {
  it("parses browse query and multi-value facets", () => {
    const route = parseHash(
      "#/browse?q=button&type=button,input&trigger=hover,click&vibe=minimal&tech=tailwind",
    );
    expect(route.view).toBe("browse");
    expect(route.query).toBe("button");
    expect(route.filters).toMatchObject({
      type: ["button", "input"],
      trigger: ["hover", "click"],
      vibe: ["minimal"],
      tech: ["tailwind"],
    });
  });

  it("parses component and expanded-preview deep links with their filters", () => {
    const inspector = parseHash("#/component/card?source=react-bits&type=card");
    expect(inspector).toMatchObject({
      view: "browse",
      componentId: "card",
      filters: { source: ["react-bits"], type: ["card"] },
    });
    const expanded = parseHash("#/preview/shadcn-button?q=button");
    expect(expanded).toMatchObject({
      view: "browse",
      expandedId: "shadcn-button",
      query: "button",
    });
  });

  it("parses all first-class views and legacy aliases", () => {
    expect(parseHash("#/collections/collection-hero")).toMatchObject({
      view: "collections",
      collectionId: "collection-hero",
    });
    expect(parseHash("#/sources/codepen")).toMatchObject({
      view: "sources",
      sourceId: "codepen",
    });
    expect(parseHash("#/selected")).toMatchObject({ view: "selected", promptFocus: false });
    expect(parseHash("#/prompt")).toMatchObject({ view: "selected", promptFocus: true });
    expect(parseHash("#/selected/prompt")).toMatchObject({ view: "selected", promptFocus: true });
    expect(parseHash("#/browser/card")).toMatchObject({ view: "browser", componentId: "card" });
    expect(parseHash("#/catalog")).toMatchObject({ view: "browser" });
    expect(parseHash("#/filters?type=button")).toMatchObject({
      view: "browse",
      mobileFilters: true,
      filters: { type: ["button"] },
    });
    expect(parseHash("#/gallery?q=card")).toMatchObject({ view: "browse", query: "card" });
    expect(parseHash("#/entry/card")).toMatchObject({ view: "browse", componentId: "card" });
    expect(parseHash("#/unknown/thing")).toMatchObject({ view: "browse" });
    expect(parseHash("")).toMatchObject({ view: "browse", query: "", filters: {} });
  });

  it("decodes encoded ids and survives malformed percent escapes", () => {
    expect(parseHash("#/component/button%20shadcn").componentId).toBe("button shadcn");
    expect(parseHash("#/component/%E0%A4%A").componentId).toBe("%E0%A4%A");
    expect(parseHash("#/sources/%ZZ").sourceId).toBe("%ZZ");
  });

  it("ignores empty query values and trims comma lists", () => {
    const route = parseHash("#/browse?type=%20button%20,%20input%20,&q=&vibe=");
    expect(route.filters.type).toEqual(["button", "input"]);
    expect(route.query).toBe("");
    expect(route.filters.vibe).toBeUndefined();
  });
});

describe("buildHash", () => {
  it("round-trips browse filters, query and overlay context", () => {
    const filters = {
      type: ["button", "input"],
      trigger: "hover",
      vibe: "minimal",
    };
    const browse = buildHash("browse", filters, "button");
    expect(parseHash(browse)).toMatchObject({
      view: "browse",
      query: "button",
      filters: {
        type: ["button", "input"],
        trigger: ["hover"],
        vibe: ["minimal"],
      },
    });

    const inspector = buildHash("browse", filters, "button", { componentId: "button" });
    expect(inspector).toContain("#/component/button?");
    expect(parseHash(inspector)).toMatchObject({
      componentId: "button",
      query: "button",
      filters: { type: ["button", "input"] },
    });

    const expanded = buildHash("browse", filters, "button", { expandedId: "button" });
    expect(expanded).toContain("#/preview/button?");
    expect(parseHash(expanded).expandedId).toBe("button");

    const mobile = buildHash("browse", filters, "", { mobileFilters: true });
    expect(mobile.startsWith("#/filters?")).toBe(true);
    expect(parseHash(mobile).mobileFilters).toBe(true);
  });

  it("builds collection, source, selected and table routes", () => {
    expect(buildHash("collections")).toBe("#/collections");
    expect(buildHash("collections", {}, "", { collectionId: "collection hero" })).toBe(
      "#/collections/collection%20hero",
    );
    expect(buildHash("sources")).toBe("#/sources");
    expect(buildHash("sources", {}, "", { sourceId: "react-bits" })).toBe("#/sources/react-bits");
    expect(buildHash("selected")).toBe("#/selected");
    expect(buildHash("selected", {}, "", { promptFocus: true })).toBe("#/prompt");
    expect(buildHash("browser")).toBe("#/browser");
    expect(buildHash("browse")).toBe("#/browse");
  });

  it("omits whitespace-only queries and empty facet arrays", () => {
    expect(buildHash("browse", { type: [] }, "   ")).toBe("#/browse");
    expect(filterQueryString({ source: ["shadcn", "react-bits"] }, "card")).toBe(
      "q=card&source=shadcn%2Creact-bits",
    );
  });
});

describe("route helpers", () => {
  it("reads query strings without constructing a full route", () => {
    expect(readFilterQuery("q=card&type=card")).toMatchObject({
      q: "card",
      filters: { type: ["card"] },
    });
    expect(readFilterQuery("")).toEqual({ q: "", filters: {} });
  });

  it("labels views and validates filter keys", () => {
    expect(routeLabel(parseHash("#/browse"))).toBe("Browse");
    expect(routeLabel(parseHash("#/collections"))).toBe("Collections");
    expect(routeLabel(parseHash("#/sources"))).toBe("Sources");
    expect(routeLabel(parseHash("#/prompt"))).toBe("Selected for AI");
    expect(routeLabel(parseHash("#/browser"))).toBe("Table");
    expect(isFilterKey("type")).toBe(true);
    expect(isFilterKey("q")).toBe(false);
    expect(isFilterKey("aesthetic")).toBe(false);
    expect(isFilterKey("unknown")).toBe(false);
  });
});
