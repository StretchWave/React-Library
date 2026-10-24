import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "./App";

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
    expect(screen.getByRole("heading", { level: 2, name: "Card" })).toBeTruthy();
    expect(screen.getByText("Themed surface container that groups related content.")).toBeTruthy();
  });

  it("switches detail when another entry is selected", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /^Card\b/ }));
    fireEvent.click(screen.getByRole("button", { name: /^Alert\b/ }));
    expect(screen.getByRole("heading", { level: 2, name: "Alert" })).toBeTruthy();
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
