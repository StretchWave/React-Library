import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FilterBar, type FilterBarProps } from "./FilterBar";

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

describe("FilterBar", () => {
  it("Escape clears the query via onQueryChange('')", () => {
    const onQueryChange = vi.fn();
    render(<FilterBar {...defaultProps({ query: "whatever", onQueryChange })} />);
    fireEvent.keyDown(screen.getByLabelText("Search components"), { key: "Escape" });
    expect(onQueryChange).toHaveBeenCalledWith("");
  });

  it("exposes every taxonomy-driven select with an all-option", () => {
    render(<FilterBar {...defaultProps()} />);
    // 1 "All categories" + 28 taxonomy categories (schema v3).
    expect((screen.getByLabelText("Category") as HTMLSelectElement).options.length).toBe(29);
    // 1 "All themes" + 6 application appearance themes.
    expect((screen.getByLabelText("Filter by theme") as HTMLSelectElement).options.length).toBe(7);
    // 1 + 22 visual-vibe aesthetics.
    expect((screen.getByLabelText("Filter by aesthetic") as HTMLSelectElement).options.length).toBe(23);
    // 1 + 12 source records.
    expect((screen.getByLabelText("Filter by source library") as HTMLSelectElement).options.length).toBe(13);
    expect(screen.getByLabelText("Catalog availability")).toBeTruthy();
    // 1 "All interactions" + 12 behavior subcategories.
    expect((screen.getByLabelText("Interaction") as HTMLSelectElement).options.length).toBe(13);
  });
});
