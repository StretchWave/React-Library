import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import App from "./App";
import { ThemeProvider } from "./theme/ThemeProvider";
import { setMotionPlaying } from "./lib/motion";
import { ANNOTATIONS_STORAGE_KEY } from "./lib/personal";
import { SELECTION_STORAGE_KEY } from "./lib/selection";

beforeEach(() => {
  localStorage.clear();
  window.history.replaceState(null, "", "/");
  setMotionPlaying(false);
});

/** App always mounts inside the theme provider (mirrors main.tsx). */
function renderApp() {
  return render(
    <ThemeProvider>
      <App />
    </ThemeProvider>,
  );
}

function browseRegion(): HTMLElement {
  return screen.getByRole("region", { name: "Browse components" });
}

function resultCount(): string {
  return within(browseRegion()).getByRole("status").textContent?.trim() ?? "";
}

function searchBox(): HTMLInputElement {
  return screen.getByRole("searchbox", {
    name: "Search the entire catalog",
  }) as HTMLInputElement;
}

function trayCount(): string {
  return screen.getByTestId("tray-count").textContent?.trim() ?? "";
}

function galleryCard(entryId: string): HTMLElement {
  const card = document.querySelector<HTMLElement>(`li[data-entry-id="${entryId}"]`);
  if (!card) throw new Error(`missing gallery card ${entryId}`);
  return card;
}

describe("App discovery shell", () => {
  it("lands on the visual Browse wall with every canonical card", async () => {
    renderApp();
    expect(browseRegion()).toBeTruthy();
    expect(screen.getByRole("heading", { name: "React Library" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Browse" }).getAttribute("aria-pressed")).toBe("true");
    const grid = screen.getByRole("list", { name: "Component gallery cards" });
    expect(grid.querySelectorAll("li[data-entry-id]").length).toBe(87);
    expect(resultCount()).toContain("87 components");
    expect(galleryCard("button")).toBeTruthy();
    expect(galleryCard("shadcn-button")).toBeTruthy();
    expect(document.querySelectorAll('li[data-preview-kind="external"]').length).toBe(16);
    await waitFor(() => expect(window.location.hash).toBe("#/browse"));
  }, 20_000);

  it("filters by query, shows an honest empty state, and resets", async () => {
    renderApp();
    fireEvent.change(searchBox(), { target: { value: "pattern" } });
    expect(resultCount()).toContain("2 of 87 components");
    expect(screen.getByRole("button", { name: "Open details for Dot Pattern (Magic UI)" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Open details for TabSheet" })).toBeTruthy();
    await waitFor(() => expect(window.location.hash).toContain("q=pattern"));

    fireEvent.change(searchBox(), { target: { value: "zzz-no-match" } });
    expect(within(browseRegion()).getByText("No components match these filters.")).toBeTruthy();
    fireEvent.click(within(browseRegion()).getByRole("button", { name: "Clear all filters" }));
    expect(resultCount()).toContain("87 components");
    expect(searchBox().value).toBe("");
  });

  it("focuses search with / and clears it with Escape", async () => {
    renderApp();
    fireEvent.keyDown(document.body, { key: "/" });
    expect(document.activeElement).toBe(searchBox());
    fireEvent.change(searchBox(), { target: { value: "btn" } });
    expect(resultCount()).toContain("1 of 87 components");
    fireEvent.keyDown(searchBox(), { key: "Escape" });
    expect(searchBox().value).toBe("");
    expect(resultCount()).toContain("87 components");
  });

  it("applies OR within a facet and AND across facet groups", () => {
    renderApp();
    fireEvent.click(screen.getByRole("checkbox", { name: "Button (2)" }));
    expect(resultCount()).toContain("2 of 87 components");
    expect(galleryCard("button")).toBeTruthy();
    expect(galleryCard("shadcn-button")).toBeTruthy();

    // Trigger is a different dimension: buttons + state-change has no matches.
    fireEvent.click(screen.getByRole("checkbox", { name: /^State change/ }));
    expect(within(browseRegion()).getByText("No components match these filters.")).toBeTruthy();

    // Adding Input inside the type group is OR, so the state-change inputs match.
    fireEvent.click(screen.getByRole("checkbox", { name: "Input (5)" }));
    expect(resultCount()).toContain("5 of 87 components");
    const active = screen.getByRole("region", { name: "Active filters" });
    expect(within(active).getAllByRole("button", { name: /^Remove / })).toHaveLength(3);
    fireEvent.click(within(active).getByRole("button", { name: "Clear all" }));
    expect(resultCount()).toContain("87 components");
  });

  it("persists the global preview pause switch", () => {
    renderApp();
    expect(screen.getByRole("button", { name: "Resume previews" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Resume previews" }));
    expect(localStorage.getItem("rl-motion-play")).toBe("playing");
    expect(screen.getByRole("button", { name: "Pause previews" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Pause previews" }));
    expect(localStorage.getItem("rl-motion-play")).toBe("paused");
    expect(screen.getByRole("button", { name: "Resume previews" })).toBeTruthy();
  });
});

describe("App deep links and overlays", () => {
  it("hydrates browse filters and preserves them through the inspector", async () => {
    window.location.hash = "#/browse?q=button&type=button";
    renderApp();
    expect(searchBox().value).toBe("button");
    expect(resultCount()).toContain("2 of 87 components");

    fireEvent.click(screen.getByRole("button", { name: "Open details for Button" }));
    const inspector = screen.getByRole("dialog", { name: "Button" });
    expect(inspector).toBeTruthy();
    expect(window.location.hash).toContain("#/component/button");
    expect(window.location.hash).toContain("q=button");
    expect(window.location.hash).toContain("type=button");

    fireEvent.click(within(inspector).getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog", { name: "Button" })).toBeNull();
    await waitFor(() => {
      expect(window.location.hash).toContain("#/browse");
      expect(window.location.hash).toContain("q=button");
      expect(window.location.hash).toContain("type=button");
    });
    expect(resultCount()).toContain("2 of 87 components");
  });

  it("drives inspector selection from hash changes and ignores unknown ids", async () => {
    renderApp();
    window.location.hash = "#/component/alert";
    expect(await screen.findByRole("dialog", { name: "Alert" })).toBeTruthy();
    window.location.hash = "#/component/extinct";
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(browseRegion()).toBeTruthy();

    window.location.hash = "#/browse";
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it(
    "opens a real expanded workspace lazily and keeps the route underneath",
    async () => {
      window.history.replaceState(null, "", "#/preview/button");
      renderApp();
      expect(screen.getByRole("dialog", { name: "Button" })).toBeTruthy();
      expect(await screen.findByTestId("preview-workspace", {}, { timeout: 30_000 })).toBeTruthy();
      expect(await screen.findByTestId("preview-stage", {}, { timeout: 30_000 })).toBeTruthy();
      expect(screen.getByTestId("preview-replay")).toBeTruthy();
      fireEvent.click(screen.getByRole("button", { name: "Close" }));
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
      expect(browseRegion()).toBeTruthy();
    },
    40_000,
  );

  it("labels external expanded previews honestly instead of faking a stage", async () => {
    window.location.hash = "#/preview/shadcn-button";
    renderApp();
    const dialog = screen.getByRole("dialog", { name: "Button (shadcn)" });
    expect(within(dialog).getByRole("heading", { name: "External reference" })).toBeTruthy();
    expect(screen.queryByTestId("preview-stage")).toBeNull();
    expect(screen.queryByTestId("preview-workspace")).toBeNull();
    expect(within(dialog).getByRole("link", { name: "Open official preview" }).getAttribute("href")).toMatch(
      /^https?:\/\//,
    );
  });

  it("opens the table with a selected record and inspector overlay", async () => {
    window.location.hash = "#/browser/card";
    renderApp();
    expect(screen.getByRole("region", { name: "Component table" })).toBeTruthy();
    expect(screen.getByRole("dialog", { name: "Card" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("region", { name: "Component table" })).toBeTruthy();
    expect(screen.getByRole("region", { name: "Component details" }).textContent).toContain("Card");
  });

  it("opens the mobile facet drawer from a shareable route and closes to browse", async () => {
    window.location.hash = "#/filters?type=button";
    renderApp();
    const facets = screen.getByLabelText("Discovery filters");
    expect(facets.getAttribute("data-mobile-open")).toBe("true");
    expect(resultCount()).toContain("2 of 87 components");
    fireEvent.click(within(facets).getByRole("button", { name: "Close filters" }));
    await waitFor(() => {
      expect(window.location.hash).toContain("#/browse");
      expect(window.location.hash).toContain("type=button");
    });
  });
});

describe("App selection, compare, and prompt", () => {
  it("selects visible cards, compares snapshots, and preserves order in the prompt", async () => {
    renderApp();
    fireEvent.click(screen.getByRole("checkbox", { name: "Button (2)" }));
    fireEvent.click(screen.getByRole("button", { name: "Select all visible results" }));
    expect(trayCount()).toBe("2");
    expect(
      (screen.getByRole("checkbox", { name: "Select Button for the master prompt" }) as HTMLInputElement)
        .checked,
    ).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "Compare selected" }));
    const compare = screen.getByRole("dialog", { name: "Compare 2 components" });
    expect(within(compare).getByText("Button (shadcn)")).toBeTruthy();
    fireEvent.click(within(compare).getByRole("button", { name: "Close" }));

    fireEvent.click(screen.getByRole("button", { name: "Generate master prompt" }));
    await waitFor(() => expect(window.location.hash).toBe("#/prompt"));
    const studio = await screen.findByRole("region", { name: "Master prompt studio" });
    const prompt = within(studio).getByLabelText("Generated master prompt").textContent ?? "";
    expect(prompt).toContain("Selected components: 2");
    expect(prompt.indexOf("## 1. Button (button)")).toBeGreaterThan(-1);
    expect(prompt.indexOf("## 2. Button (shadcn) (shadcn-button)")).toBeGreaterThan(
      prompt.indexOf("## 1. Button (button)"),
    );
    expect(prompt).toContain("External reference");
    expect(within(studio).getByText(/Button \(shadcn\): external reference/)).toBeTruthy();
  });

  it("adds personal tags and notes without mutating the canonical catalog", async () => {
    renderApp();
    fireEvent.click(screen.getByRole("button", { name: "Open details for Button" }));
    const inspector = screen.getByRole("dialog", { name: "Button" });
    fireEvent.change(within(inspector).getByLabelText("Add a manual tag"), {
      target: { value: "Hero CTA" },
    });
    fireEvent.click(within(inspector).getByRole("button", { name: "Add tag" }));
    fireEvent.change(within(inspector).getByLabelText("Notes for the next agent"), {
      target: { value: "Use on the landing hero." },
    });
    fireEvent.click(within(inspector).getByRole("checkbox", { name: "In prompt" }));
    fireEvent.click(within(inspector).getByRole("button", { name: "Close" }));

    fireEvent.click(screen.getByRole("button", { name: "Generate master prompt" }));
    const prompt = (await screen.findByLabelText("Generated master prompt")).textContent ?? "";
    expect(prompt).toContain("User-confirmed manual tags: hero-cta");
    expect(prompt).toContain("User note for this component: Use on the landing hero.");

    const stored = JSON.parse(localStorage.getItem(ANNOTATIONS_STORAGE_KEY) ?? "{}");
    expect(stored.button.manualTags).toEqual(["hero-cta"]);
    expect(stored.button.note).toBe("Use on the landing hero.");
  });

  it("keeps bulk selection when filters change and clears from the tray", () => {
    renderApp();
    fireEvent.click(screen.getByRole("checkbox", { name: "Button (2)" }));
    fireEvent.click(screen.getByRole("button", { name: "Select all visible results" }));
    expect(trayCount()).toBe("2");
    const active = screen.getByRole("region", { name: "Active filters" });
    fireEvent.click(within(active).getByRole("button", { name: "Clear all" }));
    fireEvent.change(searchBox(), { target: { value: "alert" } });
    fireEvent.click(screen.getByRole("button", { name: "Select all visible results" }));
    expect(trayCount()).toBe("4");
    fireEvent.click(within(screen.getByTestId("selection-tray")).getByRole("button", { name: "Clear all" }));
    expect(screen.queryByTestId("selection-tray")).toBeNull();
  });

  it("prunes extinct persisted ids on load", () => {
    localStorage.setItem(SELECTION_STORAGE_KEY, JSON.stringify(["button", "magic-ui-dot-pattern", "extinct-id"]));
    renderApp();
    expect(trayCount()).toBe("2");
    expect(JSON.parse(localStorage.getItem(SELECTION_STORAGE_KEY) ?? "[]")).toEqual([
      "button",
      "magic-ui-dot-pattern",
    ]);
  });
});

describe("App collections and sources", () => {
  it("persists favorites and named collections and joins catalog rows by id", async () => {
    renderApp();
    fireEvent.click(screen.getByRole("button", { name: "Add Button to favorites" }));
    expect(screen.getByRole("button", { name: "Remove Button from favorites" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Collections" }));
    const favorites = screen.getByRole("region", { name: "Favorites" });
    expect(within(favorites).getByRole("button", { name: "Open Button details" })).toBeTruthy();

    fireEvent.change(screen.getByPlaceholderText("New collection name"), { target: { value: "Hero" } });
    fireEvent.click(screen.getByRole("button", { name: "Create collection" }));
    expect(screen.getByRole("button", { name: "Open collection Hero (0 components)" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Browse" }));
    fireEvent.click(screen.getByRole("button", { name: "Open details for Button" }));
    const inspector = screen.getByRole("dialog", { name: "Button" });
    const select = within(inspector).getByLabelText("Add to collection") as HTMLSelectElement;
    const hero = Array.from(select.options).find((option) => option.text === "Hero");
    expect(hero).toBeTruthy();
    fireEvent.change(select, { target: { value: hero?.value } });
    fireEvent.click(within(inspector).getByRole("button", { name: "Add" }));
    fireEvent.click(within(inspector).getByRole("button", { name: "Close" }));

    fireEvent.click(screen.getByRole("button", { name: "Collections" }));
    fireEvent.click(screen.getByRole("button", { name: "Open collection Hero (1 components)" }));
    expect(screen.getByRole("heading", { name: "Hero" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Open Button details" })).toBeTruthy();
  });

  it("derives source coverage and exposes blocked access honestly", async () => {
    window.location.hash = "#/sources/codepen";
    renderApp();
    expect(screen.getByRole("heading", { name: "CodePen" })).toBeTruthy();
    expect(screen.getByText("Reference only")).toBeTruthy();
    expect(screen.getByText("Saved Multi-Page View Transition example")).toBeTruthy();
    expect(screen.getByText("npm run ingest-codepen -- --url=<verified-pen-url> --author=<name> --license=<id> --write")).toBeTruthy();
    expect(screen.getByText(/URL and author\/license metadata were not supplied/)).toBeTruthy();
  });

  it("reports real source totals on the Sources index", () => {
    renderApp();
    fireEvent.click(screen.getByRole("button", { name: "Sources" }));
    expect(screen.getByRole("heading", { name: "Sources" })).toBeTruthy();
    const reactBitsCard = screen.getByRole("heading", { name: "React Bits" }).closest("li");
    expect(reactBitsCard).toBeTruthy();
    expect(within(reactBitsCard as HTMLElement).getAllByText("61").length).toBeGreaterThanOrEqual(4);
    fireEvent.click(within(reactBitsCard as HTMLElement).getByRole("button", { name: "Inspect" }));
    expect(screen.getByRole("heading", { name: "React Bits" })).toBeTruthy();
    expect(screen.getByText(/Sixty-one curated React Bits items are tracked/)).toBeTruthy();
    expect(screen.getAllByText(/Commons Clause/).length).toBeGreaterThan(0);
  });
});
