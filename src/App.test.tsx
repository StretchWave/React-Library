import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { findEntry } from "./catalog/client";
import type { CatalogEntry } from "./catalog/types";
import { SELECTION_STORAGE_KEY } from "./lib/selection";
import { DetailPane } from "./components/browser/DetailPane";
import { FilterBar } from "./components/browser/FilterBar";
import type { FilterBarProps } from "./components/browser/FilterBar";
import { PreviewPanel } from "./components/browser/PreviewPanel";
import { SHOWCASE_IDS, getShowcase } from "./catalog/showcases";
import { entries } from "./catalog/client";
import { ThemeProvider } from "./theme/ThemeProvider";
import { THEME_STORAGE_KEY } from "./theme/theme";

const ENTRY_NAMES = ["Alert", "Badge", "Button", "Card", "TabSheet", "TextInput"] as const;

beforeEach(() => {
  localStorage.clear();
  window.location.hash = "";
});

/** App always mounts inside the theme provider (mirrors main.tsx). */
function renderApp() {
  return render(
    <ThemeProvider>
      <App />
    </ThemeProvider>,
  );
}

/** M7: the visual gallery is the default landing view; browser-view tests
 *  navigate there via the view switcher exactly as a user would. */
function renderBrowser() {
  const utils = renderApp();
  fireEvent.click(screen.getByRole("button", { name: "Browser" }));
  return utils;
}

function defaultProps(overrides: Partial<FilterBarProps> = {}): FilterBarProps {
  return {
    query: "",
    onQueryChange: vi.fn(),
    category: "",
    onCategoryChange: vi.fn(),
    theme: "",
    onThemeChange: vi.fn(),
    aesthetic: "",
    onAestheticChange: vi.fn(),
    behavior: "",
    onBehaviorChange: vi.fn(),
    source: "",
    onSourceChange: vi.fn(),
    entryType: "",
    onEntryTypeChange: vi.fn(),
    ...overrides,
  };
}

/** Exact accessible-name anchor for an original catalog entry row
 *  (e.g. "Button stable"), disambiguating from ingested duplicates such as
 *  "Button (shadcn) stable" that share the seeded names as prefixes. */
const STATUS_GROUP = "stable|beta|experimental|deprecated";
function entryItem(name: string) {
  return screen.getByRole("button", { name: new RegExp(`^${name} (${STATUS_GROUP})$`) });
}

describe("App (M1 skeleton)", () => {
  it("renders every canonical catalog entry name", () => {
    renderBrowser();
    expect(screen.getByText("React Library")).toBeTruthy();
    for (const name of ENTRY_NAMES) {
      expect(entryItem(name)).toBeTruthy();
    }
  });

  it("shows the empty state until an entry is selected", () => {
    renderBrowser();
    expect(screen.getAllByText(/Select a component from the catalog/).length).toBeGreaterThan(0);
  });

  it("updates the detail pane when an entry is selected", () => {
    renderBrowser();
    fireEvent.click(entryItem("Card"));
    expect(screen.getAllByRole("heading", { level: 2, name: "Card" }).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Themed surface container that groups related content.").length).toBeGreaterThan(0);
  });

  it("switches detail when another entry is selected", () => {
    renderBrowser();
    fireEvent.click(entryItem("Card"));
    fireEvent.click(entryItem("Alert"));
    expect(screen.getAllByRole("heading", { level: 2, name: "Alert" }).length).toBeGreaterThan(0);
    expect(screen.queryByRole("heading", { name: "Card" })).toBeNull();
  });

  it("marks the selected entry with aria-current", () => {
    renderBrowser();
    const before = entryItem("Button");
    expect(before.getAttribute("aria-current")).toBeNull();
    fireEvent.click(before);
    expect(before.getAttribute("aria-current")).toBe("true");
  });
});

describe("App (M2 component browser)", () => {
  it("filters by query from the search box", () => {
    renderBrowser();
    fireEvent.change(screen.getByLabelText("Search components"), { target: { value: "tabs" } });
    expect(screen.getByRole("status").textContent).toContain("2 of 87 components");
    expect(entryItem("TabSheet")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /^Alert\b/ })).toBeNull();
  });

  it("filters by category via the taxonomy-driven select", () => {
    renderBrowser();
    fireEvent.change(screen.getByLabelText("Category"), { target: { value: "inputs" } });
    expect(screen.getByRole("status").textContent).toContain("5 of 87 components");
    expect(screen.getByRole("button", { name: /^TextInput\b/ })).toBeTruthy();
  });

  it("filters by theme via the taxonomy-driven select", () => {
    renderBrowser();
    fireEvent.change(screen.getByLabelText("Filter by theme"), { target: { value: "retro-terminal" } });
    expect(screen.getByRole("status").textContent).toContain("87 of 87 components");
  });

  it("shows the filter empty state and restores on Reset filters", () => {
    renderBrowser();
    fireEvent.change(screen.getByLabelText("Search components"), { target: { value: "zzz-no-match" } });
    expect(screen.getByText(/No components match/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Reset filters" }));
    expect(screen.getByRole("status").textContent).toBe("87 components");
    expect(entryItem("Button")).toBeTruthy();
  });

  it('the "/" shortcut focuses search; Escape clears the query', () => {
    renderApp();
    fireEvent.keyDown(window, { key: "/" });
    const input = screen.getByLabelText("Search components") as HTMLInputElement;
    expect(document.activeElement).toBe(input);
    fireEvent.change(input, { target: { value: "badge" } });
    expect(input.value).toBe("badge");
    fireEvent.keyDown(input, { key: "Escape" });
    expect(input.value).toBe("");
  });

  it("keeps list, detail, and filter state independent when selecting an entry", () => {
    renderBrowser();
    fireEvent.change(screen.getByLabelText("Category"), { target: { value: "display" } });
    fireEvent.click(entryItem("Badge"));
    expect(screen.getAllByRole("heading", { level: 2, name: "Badge" }).length).toBeGreaterThan(0);
    expect(entryItem("Badge").getAttribute("aria-current")).toBe("true");
  });
});

describe("App (M3 theme engine + live preview)", () => {
  it("the theme picker switches the [data-theme] scope from taxonomy data", () => {
    renderApp();
    expect(document.querySelector('[data-theme="classic-clean"]')).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Theme"), { target: { value: "retro-terminal" } });
    expect(document.querySelector('[data-theme="retro-terminal"]')).toBeTruthy();
    expect(document.querySelector('[data-theme="classic-clean"]')).toBeNull();
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("retro-terminal");
  });

  it("cycle buttons step through the taxonomy order and persist", () => {
    renderApp();
    fireEvent.click(screen.getByRole("button", { name: "Next theme" }));
    expect(document.querySelector('[data-theme="midnight-glass"]')).toBeTruthy();
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("midnight-glass");
    fireEvent.click(screen.getByRole("button", { name: "Previous theme" }));
    expect(document.querySelector('[data-theme="classic-clean"]')).toBeTruthy();
  });

  it("renders the live preview for the selected entry's demo", () => {
    renderBrowser();
    fireEvent.click(entryItem("Button"));
    expect(screen.getByTestId("live-preview")).toBeTruthy();
    expect(document.querySelector('[data-demo-id="button"]')).toBeTruthy();
    fireEvent.click(entryItem("TabSheet"));
    expect(document.querySelector('[data-demo-id="tabs"]')).toBeTruthy();
  });

  it("invalid persisted theme ids resolve like auto on load", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "extinct-theme");
    renderApp();
    expect(document.querySelector('[data-theme="classic-clean"]')).toBeTruthy();
  });
});

describe("FilterBar (M2)", () => {
  it("Escape clears the query via onQueryChange('')", () => {
    const onQueryChange = vi.fn();
    render(<FilterBar {...defaultProps({ query: "whatever", onQueryChange })} />);
    fireEvent.keyDown(screen.getByLabelText("Search components"), { key: "Escape" });
    expect(onQueryChange).toHaveBeenCalledWith("");
  });

  it("exposes labeled category and theme selects", () => {
    render(<FilterBar {...defaultProps()} />);
    // 1 "All categories" + 24 taxonomy categories (extended set since catalog v2,
    // + motion & micro-interactions added for the M6 animation-first correction)
    expect((screen.getByLabelText("Category") as HTMLSelectElement).options.length).toBe(25);
    // 1 "All themes" + 6 application appearance themes
    expect((screen.getByLabelText("Filter by theme") as HTMLSelectElement).options.length).toBe(7);
    // M5.3: 1 all + 12 aesthetics, 1 + 9 sources, 3 availability options
    expect((screen.getByLabelText("Filter by aesthetic") as HTMLSelectElement).options.length).toBe(13);
    expect((screen.getByLabelText("Filter by source library") as HTMLSelectElement).options.length).toBe(10);
    expect(screen.getByLabelText("Catalog availability")).toBeTruthy();
    // M7.1: 1 "All interactions" + 12 behavior subcategories
    expect((screen.getByLabelText("Interaction") as HTMLSelectElement).options.length).toBe(13);
  });
});

describe("DetailPane (M2)", () => {
  it("renders status chip, metadata, themes, tags, aliases, and props table", () => {
    const button = findEntry("button") as CatalogEntry;
    render(<DetailPane entry={button} />);
    expect(screen.getByText("stable")).toBeTruthy();
    expect(screen.getByText("#action")).toBeTruthy();
    expect(screen.getByText("alias: btn")).toBeTruthy();
    expect(screen.getByTestId("theme-chips")).toBeTruthy();
    expect(screen.getAllByText("classic-clean").length).toBeGreaterThan(0);
    expect(screen.getByRole("table").textContent).toContain("variant");
    expect(screen.getByLabelText("File links")).toBeTruthy();
    expect(screen.getByText(/Accessibility:/)).toBeTruthy();
  });

  it("renders the empty state for null entries", () => {
    render(<DetailPane entry={null} />);
    expect(screen.getByText(/Select a component/)).toBeTruthy();
  });
});

describe("App (M4 deep links)", () => {
  it("deep link #/component/<id> selects that entry on load", () => {
    window.location.hash = "/component/card";
    renderApp();
    expect(screen.getAllByRole("heading", { level: 2, name: "Card" }).length).toBeGreaterThan(0);
  });

  it("selection writes the hash; hash changes drive back/forward selection", async () => {
    renderBrowser();
    fireEvent.click(entryItem("Alert"));
    expect(window.location.hash).toBe("#/component/alert");
    expect(
      screen.getAllByRole("heading", { level: 2, name: "Alert" }).length,
    ).toBeGreaterThan(0);

    // Simulate browser back/forward via hashchange (jsdom dispatches it async):
    window.location.hash = "/component/badge";
    await waitFor(() => {
      expect(screen.getAllByRole("heading", { level: 2, name: "Badge" }).length).toBeGreaterThan(0);
    });
  });

  it("clears selection when the hash leaves the component route", async () => {
    window.location.hash = "/component/alert";
    renderApp();
    expect(screen.getAllByRole("heading", { level: 2, name: "Alert" }).length).toBeGreaterThan(0);
    window.location.hash = "";
    // M7: the empty hash lands on the visual gallery with the selection cleared.
    await waitFor(() => {
      expect(screen.getByRole("region", { name: "Component gallery" })).toBeTruthy();
      expect(screen.queryByRole("heading", { level: 2, name: "Alert" })).toBeNull();
    });
  });

  it("ignores unknown ids in the hash", () => {
    window.location.hash = "/component/extinct";
    renderApp();
    expect(screen.getByRole("region", { name: "Component gallery" })).toBeTruthy();
    expect(screen.queryByRole("heading", { level: 2, name: "Alert" })).toBeNull();
  });
});

describe("App (M5.3 gallery)", () => {
  it("a fresh launch lands in the visual gallery (M7 default view)", () => {
    renderApp();
    expect(screen.getByRole("region", { name: "Component gallery" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /^Alert \b/ })).toBeNull();
  });

  it("renders a preview card per entry and every card opens the in-app workspace (M7.2)", () => {
    renderApp();
    fireEvent.click(screen.getByRole("button", { name: "Gallery" }));
    const grid = screen.getByRole("list", { name: /component gallery/i });
    expect(grid.querySelectorAll("li[data-entry-id]").length).toBe(87);
    // Seeded six render the vetted live demo; M6.6: react-bits + Magic UI run
    // live in-app; the 16 shadcn doc-page items remain honest external tiles.
    expect(document.querySelector('li[data-preview-kind="local-demo"][data-entry-id="button"]')).toBeTruthy();
    expect(document.querySelectorAll("li[data-preview-kind=\"external\"], li[data-preview-kind=\"source-link\"]").length)
      .toBe(16); // 16 shadcn doc pages stay external until M6.6-C token-bridge wrappers
    // M6.6: raw-WebGL react-bits variants run locally; no "View at source" remains.
    expect(screen.queryAllByRole("link", { name: /View at source/ }).length).toBe(0);
  });

  it("M7.2: every card's open action routes in-app, including external and non-runnable entries", () => {
    renderApp();
    fireEvent.click(screen.getByRole("button", { name: "Gallery" }));
    const openers = document.querySelectorAll<HTMLAnchorElement>("a[data-testid='gallery-card-open']");
    expect(openers.length).toBe(87);
    for (const opener of openers) {
      const card = opener.closest("li[data-entry-id]") as HTMLElement | null;
      expect(card).toBeTruthy();
      expect(opener.getAttribute("href")).toBe(`#/preview/${card?.dataset.entryId}`);
    }
    // External tiles are quiet visuals — no off-site anchor anywhere in a card.
    const externalCard = document.querySelector('li[data-preview-kind="external"]');
    expect(externalCard).toBeTruthy();
    expect(externalCard?.querySelector("a[target='_blank']")).toBeNull();
    expect(externalCard?.textContent).not.toContain("ui.shadcn.com");
  });

  it("supports source filtering inside the gallery view", () => {
    renderApp();
    fireEvent.click(screen.getByRole("button", { name: "Gallery" }));
    fireEvent.change(screen.getByLabelText("Filter by source library"), {
      target: { value: "react-bits" },
    });
    expect(screen.getByRole("status").textContent).toContain("61 of 87 entries");
    // React Bits items are all vendored and live now (M6.6 webgl flip):
    expect(document.querySelector('li[data-preview-kind="local-demo"][data-entry-id="react-bits-fluid-glass"]')).toBeTruthy();
    expect(
      document.querySelectorAll('li[data-preview-kind="local-demo"][data-entry-id^="react-bits-"]').length,
    ).toBe(61); // all 61 curated react-bits items render live through showcases
  });

  it("the #/gallery deep link opens the gallery and filters persist across views", () => {
    window.location.hash = "#/gallery";
    renderApp();
    expect(screen.getByRole("region", { name: "Component gallery" })).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Search components"), {
      target: { value: "pattern" },
    });
    expect(screen.getByRole("status").textContent).toContain("2 of 87 entries");
    fireEvent.click(screen.getByRole("button", { name: "Browser" }));
    expect((screen.getByLabelText("Search components") as HTMLInputElement).value).toBe("pattern");
  });
});

describe("App (M5.4 multi-selection)", () => {
  function trayCount(): string {
    return screen.getByTestId("tray-count").textContent?.trim() ?? "";
  }

  it("adds and removes selections via the gallery checkboxes", () => {
    renderApp();
    fireEvent.click(screen.getByRole("button", { name: "Gallery" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Select Button for the master prompt" }));
    expect(trayCount()).toBe("1");
    expect(
      (screen.getByRole("checkbox", { name: "Select Button for the master prompt" }) as HTMLInputElement)
        .checked,
    ).toBe(true);
    fireEvent.click(
      screen.getByRole("checkbox", { name: "Select Button (shadcn) for the master prompt" }),
    );
    expect(trayCount()).toBe("2");
    fireEvent.click(screen.getByRole("checkbox", { name: "Select Button for the master prompt" }));
    expect(trayCount()).toBe("1");
    expect(
      (
        screen.getByRole("checkbox", {
          name: "Select Button (shadcn) for the master prompt",
        }) as HTMLInputElement
      ).checked,
    ).toBe(true);
  });

  it("select all visible respects the filters and survives filter changes", () => {
    renderApp();
    fireEvent.click(screen.getByRole("button", { name: "Gallery" }));
    fireEvent.change(screen.getByLabelText("Filter by source library"), {
      target: { value: "react-bits" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Select all visible results" }));
    expect(trayCount()).toBe("61");
    // Selection must survive filter/search changes (spec M5.4).
    fireEvent.change(screen.getByLabelText("Filter by source library"), { target: { value: "" } });
    fireEvent.change(screen.getByLabelText("Catalog availability"), { target: { value: "local" } });
    expect(trayCount()).toBe("61");
    expect(screen.getByRole("status").textContent).toContain("87 of 87 entries");
    fireEvent.click(screen.getByRole("button", { name: "Clear all" }));
    expect(trayCount()).toBe("0");
  });

  it("persists the selection and prunes ids that no longer exist", () => {
    localStorage.setItem(
      SELECTION_STORAGE_KEY,
      JSON.stringify(["button", "magic-ui-dot-pattern", "extinct-id"]),
    );
    renderApp();
    fireEvent.click(screen.getByRole("button", { name: "Gallery" }));
    expect(trayCount()).toBe("2");
    expect(JSON.parse(localStorage.getItem(SELECTION_STORAGE_KEY) ?? "[]")).toEqual([
      "button",
      "magic-ui-dot-pattern",
    ]);
  });

  it("the tray reviews, reorders, and removes the selection", () => {
    renderApp();
    fireEvent.click(screen.getByRole("button", { name: "Gallery" }));
    fireEvent.click(
      screen.getByRole("checkbox", { name: "Select Dot Pattern (Magic UI) for the master prompt" }),
    );
    fireEvent.click(screen.getByRole("checkbox", { name: "Select Button for the master prompt" }));
    const tray = screen.getByTestId("selection-tray");
    let order = [...tray.querySelectorAll(".tray-name")].map((node) => node.textContent);
    expect(order).toEqual(["Dot Pattern (Magic UI)", "Button"]);
    fireEvent.click(screen.getByRole("button", { name: "Move Dot Pattern (Magic UI) later in the selection" }));
    order = [...tray.querySelectorAll(".tray-name")].map((node) => node.textContent);
    expect(order).toEqual(["Button", "Dot Pattern (Magic UI)"]);
    fireEvent.click(screen.getByRole("button", { name: "Remove Dot Pattern (Magic UI) from the selection" }));
    order = [...tray.querySelectorAll(".tray-name")].map((node) => node.textContent);
    expect(order).toEqual(["Button"]);
  });

  it("the detail view offers a selection toggle (browser view)", () => {
    renderBrowser();
    fireEvent.click(entryItem("Button"));
    fireEvent.click(screen.getByRole("checkbox", { name: "Select Button for the master prompt" }));
    // The selection count chip in the header reflects browser-view selections.
    expect(screen.getByText(/^87 local · 0 external · 1 selected$/)).toBeTruthy();
  });

  it("generate master prompt opens the prompt view with the selection intact", () => {
    renderApp();
    fireEvent.click(screen.getByRole("button", { name: "Gallery" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Select Button for the master prompt" }));
    expect(
      (screen.getByRole("button", { name: "Generate master prompt" }) as HTMLButtonElement).disabled,
    ).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "Generate master prompt" }));
    expect(window.location.hash).toBe("#/prompt");
    const studio = screen.getByRole("region", { name: "Master prompt studio" });
    expect(studio.textContent).toContain("1 component");
    fireEvent.click(screen.getByRole("button", { name: "Back to selection" }));
    expect(trayCount()).toBe("1");
  });

  it("the studio prompt carries official retrieval and license facts from catalog records (M5.5)", () => {
    renderApp();
    fireEvent.click(screen.getByRole("button", { name: "Gallery" }));
    fireEvent.click(
      screen.getByRole("checkbox", { name: "Select Split Text (React Bits) for the master prompt" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Generate master prompt" }));
    const promptEl = screen.getByLabelText("Generated master prompt");
    expect(promptEl.textContent).toContain("- Official retrieval (alternative channel): npx shadcn@latest add");
    expect(promptEl.textContent).toContain("Commons Clause");
  });

  it("an empty selection cannot open the prompt view", () => {
    // A crafted deep link into the studio with nothing selected must stay
    // honest about the empty selection (hash is resolved before render here —
    // the mount-time syncFromHash handles it deterministically).
    window.location.hash = "#/prompt";
    renderApp();
    const studio = screen.getByRole("region", { name: "Master prompt studio" });
    expect(studio.textContent).toContain("0 components");
    expect(window.location.hash).toBe("#/prompt");
  });
});

describe("App (M6.2 preview workspace)", () => {
  it("deep link #/preview/<id> runs a vendored stage with live controls", async () => {
    window.location.hash = "/preview/react-bits-shiny-text";
    renderApp();
    const stage = await screen.findByTestId("preview-stage");
    expect(stage).toBeTruthy();
    expect(stage.textContent).toContain("Shiny text shimmer");
    expect(screen.getByTestId("preview-controls")).toBeTruthy();
    // Replay affordance exists for every runnable stage.
    expect(screen.getByTestId("preview-replay")).toBeTruthy();
    // Changing the Text control updates the stage content live.
    const text = screen.getByLabelText("Text") as HTMLInputElement;
    expect(text.value).toBe("Shiny text shimmer");
    fireEvent.change(text, { target: { value: "Fall shimmer" } });
    expect(screen.getByTestId("preview-stage").textContent).toContain("Fall shimmer");
    // Stage mode flips the wrap attribute (tokens-only backgrounds).
    fireEvent.change(screen.getByLabelText("Stage background mode"), { target: { value: "grid" } });
    expect(screen.getByTestId("preview-stage-wrap").getAttribute("data-stage")).toBe("grid");
    // Viewport constrains the stage frame.
    fireEvent.change(screen.getByLabelText("Stage viewport width"), { target: { value: "375" } });
    const frame = screen.getByTestId("preview-stage");
    expect(frame.getAttribute("data-viewport")).toBe("375");
    expect((frame as HTMLElement).style.maxWidth).toBe("375px");
  });

  it("the info rail carries runtime, retrieval, license, dependencies, and selection", async () => {
    window.location.hash = "/preview/react-bits-decrypted-text";
    renderApp();
    const rail = await screen.findByTestId("preview-rail");
    expect(rail.textContent).toContain("runtime: motion");
    expect(rail.textContent).toContain("Commons Clause");
    expect(rail.textContent).toContain("npx shadcn@latest add");
    expect(rail.textContent).toContain("Related in this source");
    const record = screen.getByTestId("preview-full-record");
    expect(record.getAttribute("href")).toBe("#/component/react-bits-decrypted-text");
    // Selection works from the workspace rail with the shared wording.
    fireEvent.click(screen.getByRole("checkbox", { name: "Select Decrypted Text (React Bits) for the master prompt" }));
    expect(screen.getByText(/^87 local · 0 external · 1 selected$/)).toBeTruthy();
  });

  it("non-runnable entries show an honest kind card instead of a stage", async () => {
    window.location.hash = "/preview/shadcn-accordion";
    renderApp();
    const honest = await screen.findByTestId("preview-honest");
    expect(honest.textContent).toContain("external");
    expect(screen.queryByTestId("preview-controls")).toBeNull();
    expect(screen.queryByTestId("preview-stage")).toBeNull();
    const official = screen.getByRole("link", { name: "Open official preview ↗" });
    expect((official.getAttribute("href") ?? "").startsWith("http")).toBe(true);
    expect(
      honest.querySelector('[data-testid="preview-full-record"]')?.getAttribute("href"),
    ).toBe("#/component/shadcn-accordion");
  });

  it("seeded components reuse their vetted demos in the workspace", async () => {
    window.location.hash = "/preview/card";
    renderApp();
    await screen.findByTestId("preview-rail");
    expect(document.querySelector('[data-demo-id="card"]')).toBeTruthy();
    expect(screen.getByTestId("preview-rail").textContent).toContain("local record");
  });

  it("the browser detail pane links into the workspace (href) and deep link opens it", async () => {
    renderBrowser();
    fireEvent.click(entryItem("Card"));
    // jsdom does not navigate on anchor clicks; assert the deep link affordance,
    // then enter the route the way a browser would (hash change).
    expect(screen.getByRole("link", { name: "Open full preview workspace ↗" }).getAttribute("href")).toBe(
      "#/preview/card",
    );
    window.location.hash = "/preview/card";
    await waitFor(() => {
      expect(screen.getByTestId("preview-workspace")).toBeTruthy();
    });
    expect(document.querySelector('[data-demo-id="card"]')).toBeTruthy();
  });

  it("unknown preview ids fall back to the workspace empty state", async () => {
    window.location.hash = "/preview/extinct";
    renderApp();
    expect(await screen.findByRole("link", { name: "Back to gallery" })).toBeTruthy();
  });

  it("every runnable catalog entry resolves through the showcase registry", () => {
    const live = entries.filter(
      (entry) => entry.source === "react-bits" && entry.preview?.type === "local-demo",
    );
    expect(live.length).toBe(61);
    for (const entry of live) {
      expect(SHOWCASE_IDS).toContain(entry.id);
      expect(getShowcase(entry.id)).toBeTruthy();
    }
    // M6.6: the four Magic UI items run live too (motion/react + cn alias).
    const magic = entries.filter(
      (entry) => entry.source === "magic-ui" && entry.preview?.type === "local-demo",
    );
    expect(magic.length).toBe(4);
    for (const entry of magic) {
      expect(SHOWCASE_IDS).toContain(entry.id);
      expect(getShowcase(entry.id)).toBeTruthy();
    }
    for (const seededId of ["alert", "badge", "button", "card", "tabs", "text-input"]) {
      expect(getShowcase(seededId)).toBeTruthy();
    }
    // Honest invariant: records not yet wrapped resolve no stage (M6.6-C wraps shadcn).
    expect(getShowcase("shadcn-accordion")).toBeUndefined();
    // Registry ids stay unique (a second registration would throw on import).
    expect(new Set(SHOWCASE_IDS).size).toBe(65);
  });
});

describe("App (M6.4 gallery motion)", () => {
  function cardFrame(entryId: string): HTMLElement | null {
    return document.querySelector<HTMLElement>(
      `li[data-entry-id="${entryId}"] .preview-frame`,
    );
  }

  it("gallery cards play showcase previews on demand (manual fallback in jsdom)", async () => {
    renderApp();
    fireEvent.click(screen.getByRole("button", { name: "Gallery" }));
    fireEvent.change(screen.getByLabelText("Filter by source library"), {
      target: { value: "react-bits" },
    });
    fireEvent.change(screen.getByLabelText("Search components"), { target: { value: "shiny" } });
    const card = cardFrame("react-bits-shiny-text");
    expect(card?.getAttribute("data-preview-kind")).toBe("local-demo");
    expect(card?.getAttribute("data-played")).toBe("false");
    fireEvent.click(screen.getByRole("button", { name: "Play preview of Shiny Text (React Bits)" }));
    // data-played flips with the playback request; the stage itself mounts
    // once the code-split showcase registry chunk resolves (M6.6).
    expect(cardFrame("react-bits-shiny-text")?.getAttribute("data-played")).toBe("true");
    await waitFor(() => {
      expect(
        document.querySelector('li[data-entry-id="react-bits-shiny-text"] .preview-mini-stage'),
      ).toBeTruthy();
    });
  });

  it("heavy previews keep a workspace link instead of auto playback", () => {
    renderApp();
    fireEvent.click(screen.getByRole("button", { name: "Gallery" }));
    fireEvent.change(screen.getByLabelText("Filter by source library"), {
      target: { value: "react-bits" },
    });
    fireEvent.change(screen.getByLabelText("Search components"), { target: { value: "falling" } });
    const card = cardFrame("react-bits-falling-text");
    expect(card?.getAttribute("data-heavy")).toBe("true");
    expect(screen.queryByRole("button", { name: "Play preview of Falling Text (React Bits)" })).toBeNull();
    const open = card?.closest("li")?.querySelector("a[data-testid='gallery-card-open']");
    expect(open?.getAttribute("href")).toBe("#/preview/react-bits-falling-text");
    expect(card?.textContent).toContain("Heavy preview");
    // M7.2 de-cluttered poster: no paragraph copy and no duplicated action link.
    expect(card?.querySelector(".preview-mini-open-title")).toBeNull();
    expect(card?.querySelector(".preview-mini-note")).toBeNull();
  });

  it("the gallery motion toggle pauses and persists", () => {
    renderApp();
    fireEvent.click(screen.getByRole("button", { name: "Gallery" }));
    // Default is playing (visual-gallery-first goal); toggles flip everywhere.
    fireEvent.click(screen.getByRole("button", { name: "Pause previews" }));
    expect(localStorage.getItem("rl-motion-play")).toBe("paused");
    expect(document.querySelectorAll(".preview-mini-stage").length).toBe(0);
    expect(screen.getAllByText("Previews are paused.").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "Play previews" }));
    expect(localStorage.getItem("rl-motion-play")).toBe("playing");
    expect(screen.getAllByRole("button", { name: /^Play preview of / }).length).toBeGreaterThan(0);
  });
});

describe("PreviewPanel (M4 copy-usage)", () => {
  it("copies a usage snippet derived from catalog links", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });
    render(
      <ThemeProvider>
        <PreviewPanel entry={findEntry("button") as CatalogEntry} />
      </ThemeProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Copy usage snippet for Button" }));
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    const snippet = writeText.mock.calls[0]![0] as string;
    expect(snippet).toContain('import { Button } from "src/components/Button/Button"');
    expect(snippet).toContain("<Button");
    expect(screen.getByText("Copied ✓")).toBeTruthy();
  });

  it("falls back to recorded implementation paths for vendored entries", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });
    const entry = findEntry("shadcn-button") as CatalogEntry;
    render(
      <ThemeProvider>
        <PreviewPanel entry={entry} />
      </ThemeProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Copy usage snippet for Button (shadcn)" }));
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    const snippet = writeText.mock.calls[0]![0] as string;
    expect(snippet).toContain(
      `import { Buttonshadcn } from "${entry.implementation?.[0]?.replace(/\.tsx$/, "")}"`,
    );
  });

  it("falls back to slice-free labels when links are absent", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });
    const ghost = { ...(findEntry("button") as CatalogEntry), id: "ghost", name: "GhostThing", links: undefined };
    render(
      <ThemeProvider>
        <PreviewPanel entry={ghost} />
      </ThemeProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Copy usage snippet for GhostThing" }));
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    expect(writeText.mock.calls[0]![0]).toContain("// GhostThing (no source link registered");
  });
});

describe("App (M7.1 minimal gallery + behaviors)", () => {
  function galleryCard(entryId: string): HTMLElement {
    return document.querySelector(`li[data-entry-id="${entryId}"]`) as HTMLElement;
  }

  it("each card shows only the preview, the name, and the selection checkbox", () => {
    renderApp();
    fireEvent.click(screen.getByRole("button", { name: "Gallery" }));
    fireEvent.change(screen.getByLabelText("Search components"), { target: { value: "shiny" } });
    const card = galleryCard("react-bits-shiny-text");
    // The name is the card's only visible text (exactly one heading).
    expect(card.querySelectorAll("h3").length).toBe(1);
    // No metadata leaked back into the card (all of it lives in the rail/detail view).
    expect(card.querySelector(".gallery-summary")).toBeNull();
    expect(card.querySelector(".status-chip")).toBeNull();
    expect(card.querySelector(".type-chip")).toBeNull();
    expect(card.querySelector(".aesthetic-chip")).toBeNull();
    expect(card.querySelector(".kind-chip")).toBeNull();
    // Exactly one open action (the stretched overlay link) and one checkbox.
    expect(card.querySelectorAll('[data-testid="gallery-card-open"]').length).toBe(1);
    expect(card.querySelectorAll('input[type="checkbox"]').length).toBe(1);
  });

  it("toggling the checkbox never opens the preview or navigates away", () => {
    renderApp();
    fireEvent.click(screen.getByRole("button", { name: "Gallery" }));
    fireEvent.change(screen.getByLabelText("Search components"), { target: { value: "shiny" } });
    fireEvent.click(
      screen.getByRole("checkbox", { name: "Select Shiny Text (React Bits) for the master prompt" }),
    );
    // Checkbox isolation: selection only — no route change, no preview route.
    expect(window.location.hash).toBe("#/gallery");
    expect(screen.getByTestId("tray-count").textContent?.trim()).toBe("1");
  });

  it("opens the in-app preview workspace from the card's open action", () => {
    renderApp();
    fireEvent.click(screen.getByRole("button", { name: "Gallery" }));
    fireEvent.change(screen.getByLabelText("Search components"), { target: { value: "shiny" } });
    const overlay = galleryCard("react-bits-shiny-text").querySelector<HTMLAnchorElement>(
      '[data-testid="gallery-card-open"]',
    );
    // The stretched link targets the local preview workspace deep link.
    expect(overlay?.getAttribute("href")).toBe("#/preview/react-bits-shiny-text");
  });

  it("filters the gallery by interaction behavior", () => {
    renderApp();
    fireEvent.click(screen.getByRole("button", { name: "Gallery" }));
    fireEvent.change(screen.getByLabelText("Interaction"), { target: { value: "scroll" } });
    expect(screen.getByRole("status").textContent).toContain("5 of 87 entries");
    fireEvent.change(screen.getByLabelText("Interaction"), { target: { value: "interactive-nav" } });
    expect(screen.getByRole("status").textContent).toContain("8 of 87 entries");
  });

  it("the preview workspace rail classifies behaviors and the stage explains interaction", async () => {
    window.location.hash = "/preview/react-bits-dock";
    renderApp();
    const rail = await screen.findByTestId("preview-rail");
    // Both behavior classifications surface with their taxonomy labels.
    expect(rail.textContent).toContain("Hover interaction");
    expect(rail.textContent).toContain("Interactive navigation");
    // The behavior-derived cue replaces the generic hint under the stage.
    const cue = await screen.findByTestId("preview-interaction-cue");
    expect(cue.textContent).toContain("Rest the pointer");
  });

  it("M7.2: drag cues match the verified draggable behavior", async () => {
    window.location.hash = "/preview/react-bits-elastic-slider";
    renderApp();
    const cue = await screen.findByTestId("preview-interaction-cue");
    expect(cue.textContent).toContain("Drag");
  });

  it("M7.2: live stages that respond to the pointer publish data-interactive", async () => {
    renderApp();
    fireEvent.click(screen.getByRole("button", { name: "Gallery" }));
    fireEvent.change(screen.getByLabelText("Filter by source library"), {
      target: { value: "react-bits" },
    });
    fireEvent.change(screen.getByLabelText("Search components"), { target: { value: "glare" } });
    fireEvent.click(screen.getByRole("button", { name: "Play preview of Glare Hover (React Bits)" }));
    await waitFor(() => {
      const stage = document.querySelector('li[data-entry-id="react-bits-glare-hover"] .preview-mini-stage');
      expect(stage?.getAttribute("data-interactive")).toBe("true");
    });
  });

  it("M7.2: click-triggered stages keep the full-card click-to-open (no data-interactive)", async () => {
    renderApp();
    fireEvent.click(screen.getByRole("button", { name: "Gallery" }));
    fireEvent.change(screen.getByLabelText("Filter by source library"), {
      target: { value: "react-bits" },
    });
    fireEvent.change(screen.getByLabelText("Search components"), { target: { value: "click-spark" } });
    fireEvent.click(screen.getByRole("button", { name: "Play preview of Click Spark (React Bits)" }));
    await waitFor(() => {
      expect(
        document.querySelector('li[data-entry-id="react-bits-click-spark"] .preview-mini-stage'),
      ).toBeTruthy();
    });
    const stage = document.querySelector('li[data-entry-id="react-bits-click-spark"] .preview-mini-stage');
    expect(stage?.getAttribute("data-interactive")).toBeNull();
  });

  it("M7.2: the workspace publishes an inner-scrollable stage for scroll-triggered entries", async () => {
    window.location.hash = "/preview/react-bits-animated-content";
    renderApp();
    const wrap = await screen.findByTestId("preview-stage-wrap");
    expect(wrap.getAttribute("data-scroll")).toBe("true");
    // The behavior-derived cue tells the user to scroll inside the canvas.
    const cue = await screen.findByTestId("preview-interaction-cue");
    expect(cue.textContent).toContain("Scroll inside the stage");
  });

  it("M7.2: provenance facts stay available but collapsed in the workspace rail", async () => {
    window.location.hash = "/preview/react-bits-dock";
    renderApp();
    const details = await screen.findByTestId("preview-details");
    expect(details.querySelector("summary")?.textContent).toContain("Provenance");
    // jsdom's <details> starts closed; the facts exist only inside its body.
    expect((details as HTMLDetailsElement).open).toBe(false);
    const body = details.querySelector(".workspace-details-body");
    expect(body?.textContent).toContain("Vendored files");
    // The rail keeps the primary identity/selection/controls above it.
    expect(await screen.findByTestId("preview-rail")).toBeTruthy();
  });
});
