import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { findEntry } from "../../catalog/client";
import type { CatalogEntry } from "../../catalog/types";
import { DetailPane } from "./DetailPane";

describe("DetailPane", () => {
  it("renders status, metadata, themes, tags, aliases, props, and links", () => {
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

  it("renders the empty state for a null entry", () => {
    render(<DetailPane entry={null} />);
    expect(screen.getByText(/Select a component/)).toBeTruthy();
  });
});
