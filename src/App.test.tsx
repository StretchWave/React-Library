import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { findEntry } from "./catalog/client";
import type { CatalogEntry } from "./catalog/types";
import { DetailPane } from "./components/browser/DetailPane";
import { FilterBar } from "./components/browser/FilterBar";
import type { FilterBarProps } from "./components/browser/FilterBar";
import { PreviewPanel } from "./components/browser/PreviewPanel";
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

function defaultProps(overrides: Partial<FilterBarProps> = {}): FilterBarProps {
  return {
    query: "",
    onQueryChange: vi.fn(),
    category: "",
    onCategoryChange: vi.fn(),
    theme: "",
    onThemeChange: vi.fn(),
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
    renderApp();
    expect(screen.getByText("React Library")).toBeTruthy();
    for (const name of ENTRY_NAMES) {
      expect(entryItem(name)).toBeTruthy();
    }
  });

  it("shows the empty state until an entry is selected", () => {
    renderApp();
    expect(screen.getAllByText(/Select a component from the catalog/).length).toBeGreaterThan(0);
  });

  it("updates the detail pane when an entry is selected", () => {
    renderApp();
    fireEvent.click(entryItem("Card"));
    expect(screen.getAllByRole("heading", { level: 2, name: "Card" }).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Themed surface container that groups related content.").length).toBeGreaterThan(0);
  });

  it("switches detail when another entry is selected", () => {
    renderApp();
    fireEvent.click(entryItem("Card"));
    fireEvent.click(entryItem("Alert"));
    expect(screen.getAllByRole("heading", { level: 2, name: "Alert" }).length).toBeGreaterThan(0);
    expect(screen.queryByRole("heading", { name: "Card" })).toBeNull();
  });

  it("marks the selected entry with aria-current", () => {
    renderApp();
    const before = entryItem("Button");
    expect(before.getAttribute("aria-current")).toBeNull();
    fireEvent.click(before);
    expect(before.getAttribute("aria-current")).toBe("true");
  });
});

describe("App (M2 component browser)", () => {
  it("filters by query from the search box", () => {
    renderApp();
    fireEvent.change(screen.getByLabelText("Search components"), { target: { value: "tabs" } });
    expect(screen.getByRole("status").textContent).toContain("2 of 33 components");
    expect(entryItem("TabSheet")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /^Alert\b/ })).toBeNull();
  });

  it("filters by category via the taxonomy-driven select", () => {
    renderApp();
    fireEvent.change(screen.getByLabelText("Category"), { target: { value: "inputs" } });
    expect(screen.getByRole("status").textContent).toContain("3 of 33 components");
    expect(screen.getByRole("button", { name: /^TextInput\b/ })).toBeTruthy();
  });

  it("filters by theme via the taxonomy-driven select", () => {
    renderApp();
    fireEvent.change(screen.getByLabelText("Filter by theme"), { target: { value: "retro-terminal" } });
    expect(screen.getByRole("status").textContent).toContain("33 of 33 components");
  });

  it("shows the filter empty state and restores on Reset filters", () => {
    renderApp();
    fireEvent.change(screen.getByLabelText("Search components"), { target: { value: "zzz-no-match" } });
    expect(screen.getByText(/No components match/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Reset filters" }));
    expect(screen.getByRole("status").textContent).toBe("33 components");
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
    renderApp();
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
    renderApp();
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
    // 1 "All categories" + 22 taxonomy categories (extended set since catalog v2)
    expect((screen.getByLabelText("Category") as HTMLSelectElement).options.length).toBe(23);
    // 1 "All themes" + 6 application appearance themes
    expect((screen.getByLabelText("Filter by theme") as HTMLSelectElement).options.length).toBe(7);
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
    renderApp();
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
    await waitFor(() => {
      expect(screen.getAllByText(/Select a component from the catalog/).length).toBeGreaterThan(0);
    });
  });

  it("ignores unknown ids in the hash", () => {
    window.location.hash = "/component/extinct";
    renderApp();
    expect(screen.getAllByText(/Select a component from the catalog/).length).toBeGreaterThan(0);
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
