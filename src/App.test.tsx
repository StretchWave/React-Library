import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import App from "./App";
import { FilterBar } from "./components/browser/FilterBar";
import { DetailPane } from "./components/browser/DetailPane";
import { findEntry } from "./catalog/client";

const ENTRY_NAMES = ["Alert", "Badge", "Button", "Card", "TabSheet", "TextInput"] as const;

describe("App (M1 skeleton)", () => {
  it("renders every canonical catalog entry name", () => {
    render(<App />);
    expect(screen.getByText("React Library")).toBeTruthy();
    for (const name of ENTRY_NAMES) {
      expect(screen.getByRole("button", { name: new RegExp(`^${name}\\b`) })).toBeTruthy();
    }
  });

  it("shows the empty state until an entry is selected", () => {
    render(<App />);
    expect(screen.getByText(/Select a component from the catalog/)).toBeTruthy();
  });

  it("updates the detail pane when an entry is selected", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /^Card\b/ }));
    expect(screen.getAllByRole("heading", { level: 2, name: "Card" }).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Themed surface container that groups related content.").length).toBeGreaterThan(0);
  });

  it("switches detail when another entry is selected", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /^Card\b/ }));
    fireEvent.click(screen.getByRole("button", { name: /^Alert\b/ }));
    expect(screen.getAllByRole("heading", { level: 2, name: "Alert" }).length).toBeGreaterThan(0);
    expect(screen.queryByRole("heading", { name: "Card" })).toBeNull();
  });

  it("marks the selected entry with aria-current", () => {
    render(<App />);
    const before = screen.getByRole("button", { name: /^Button\b/ });
    expect(before.getAttribute("aria-current")).toBeNull();
    fireEvent.click(before);
    expect(before.getAttribute("aria-current")).toBe("true");
  });
});

describe("App (M2 component browser)", () => {
  it("filters by query from the search box", () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText("Search components"), { target: { value: "tabs" } });
    expect(screen.getByRole("status").textContent).toContain("1 of 6 components");
    expect(screen.getByRole("button", { name: /^TabSheet\b/ })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /^Alert\b/ })).toBeNull();
  });

  it("filters by category via the taxonomy-driven select", () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText("Category"), { target: { value: "inputs" } });
    expect(screen.getByRole("status").textContent).toContain("1 of 6 components");
    expect(screen.getByRole("button", { name: /^TextInput\b/ })).toBeTruthy();
  });

  it("filters by theme via the taxonomy-driven select", () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText("Theme"), { target: { value: "retro-terminal" } });
    // Every entry supports every theme, so all six remain.
    expect(screen.getByRole("status").textContent).toContain("6 of 6 components");
  });

  it("shows the filter empty state and restores on Reset filters", () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText("Search components"), { target: { value: "zzz-no-match" } });
    expect(screen.getByText(/No components match/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Reset filters" }));
    expect(screen.getByRole("status").textContent).toBe("6 components");
    expect(screen.getByRole("button", { name: /^Button\b/ })).toBeTruthy();
  });

  it('the "/" shortcut focuses search; Escape clears the query', () => {
    render(<App />);
    fireEvent.keyDown(window, { key: "/" });
    const input = screen.getByLabelText("Search components") as HTMLInputElement;
    expect(document.activeElement).toBe(input);
    fireEvent.change(input, { target: { value: "badge" } });
    expect(input.value).toBe("badge");
    fireEvent.keyDown(input, { key: "Escape" });
    expect(input.value).toBe("");
  });

  it("keeps list, detail, and filter state independent when selecting an entry", () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText("Category"), { target: { value: "display" } });
    fireEvent.click(screen.getByRole("button", { name: /^Badge\b/ }));
    expect(screen.getAllByRole("heading", { level: 2, name: "Badge" }).length).toBeGreaterThan(0);
    // Selected entry stays selected even though the list keeps showing only display entries.
    expect(screen.getByRole("button", { name: /^Badge\b/ }).getAttribute("aria-current")).toBe("true");
  });
});

describe("FilterBar (M2)", () => {
  it("Escape clears the query via onQueryChange('')", () => {
    const onQueryChange = vi.fn();
    render(
      <FilterBar
        query="whatever"
        onQueryChange={onQueryChange}
        category=""
        onCategoryChange={vi.fn()}
        theme=""
        onThemeChange={vi.fn()}
      />,
    );
    fireEvent.keyDown(screen.getByLabelText("Search components"), { key: "Escape" });
    expect(onQueryChange).toHaveBeenCalledWith("");
  });

  it("exposes labeled category and theme selects", () => {
    render(
      <FilterBar
        query=""
        onQueryChange={vi.fn()}
        category=""
        onCategoryChange={vi.fn()}
        theme=""
        onThemeChange={vi.fn()}
      />,
    );
    expect((screen.getByLabelText("Category") as HTMLSelectElement).options.length).toBe(7); // All + 6
    expect((screen.getByLabelText("Theme") as HTMLSelectElement).options.length).toBe(7);
  });
});

describe("DetailPane (M2)", () => {
  it("renders status chip, metadata, themes, tags, aliases, and props table", () => {
    const button = findEntry("button");
    expect(button).toBeTruthy();
    render(<DetailPane entry={button!} />);
    expect(screen.getByText("stable")).toBeTruthy();
    expect(screen.getByText("#action")).toBeTruthy();
    expect(screen.getByText("alias: btn")).toBeTruthy();
    expect(screen.getAllByTestId("theme-chips")).toBeTruthy();
    expect(screen.getAllByText("classic-clean").length).toBeGreaterThan(0);
    expect(screen.getByRole("table").textContent).toContain("variant");
    expect(screen.getAllByLabelText("File links").length).toBeGreaterThan(0);
    expect(screen.getByText(/Accessibility:/)).toBeTruthy();
  });

  it("renders the empty state for null entries", () => {
    render(<DetailPane entry={null} />);
    expect(screen.getByText(/Select a component/)).toBeTruthy();
  });
});
