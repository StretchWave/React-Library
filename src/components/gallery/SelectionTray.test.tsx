// Selection tray tests (M5.4): honest availability flags + tray interactions.
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { CatalogEntry } from "../../catalog/types";
import { availabilityNotes, SelectionTray } from "./SelectionTray";

function makeEntry(overrides: Partial<CatalogEntry> = {}): CatalogEntry {
  return {
    id: "synthetic-one",
    name: "Synthetic One",
    summary: "Synthetic summary",
    category: "buttons",
    themes: ["classic-clean"],
    aliases: [],
    tags: [],
    status: "stable",
    version: "1.0.0",
    addedDate: "2026-10-24",
    externalDependencies: [],
    props: [],
    types: ["button"],
    triggers: ["static"],
    techniques: [],
    tagMeta: { sourceProvided: [], inferred: [], reviewNeeded: false },
    previewProfile: {
      mode: "snapshot",
      layout: "standard",
      cost: "low",
      aspectRatio: "4 / 3",
      minWidth: 240,
      minHeight: 220,
      gridColumnSpan: 1,
      gridRowSpan: 1,
      expandedRecommended: false,
      requires: [],
      autoplayAllowed: false,
      previewStatus: "ready",
    },
    ...overrides,
  };
}

describe("availabilityNotes (M5.4)", () => {
  it("flags local entries that record no extension point at all", () => {
    expect(availabilityNotes(makeEntry())).toEqual([
      "no local extension point recorded (manifest/implementation/source link)",
    ]);
  });

  it("stays quiet for healthy local and external entries", () => {
    const local = makeEntry({ manifest: "catalog/components/x/component.json" });
    const external = makeEntry({
      id: "ext",
      name: "Ext",
      entryType: "external",
      source: "react-bits",
      retrieval: "npx shadcn@latest add @react-bits/SplitText",
    });
    expect(availabilityNotes(local)).toEqual([]);
    expect(availabilityNotes(external)).toEqual([]);
  });

  it("flags external entries without official retrieval instructions", () => {
    const entry = makeEntry({ entryType: "external", source: "react-bits" });
    expect(availabilityNotes(entry)).toEqual(["missing official retrieval instructions"]);
  });

  it("surfaces an explicitly unavailable preview", () => {
    const entry = makeEntry({
      manifest: "m.json",
      preview: { type: "none", note: "no preview permitted by the source" },
    });
    expect(availabilityNotes(entry)).toEqual(["preview unavailable (no preview permitted by the source)"]);
  });
});

describe("SelectionTray", () => {
  function trayCount(): string {
    return screen.getByTestId("tray-count").textContent?.trim() ?? "";
  }

  it("stays out of the way while nothing is selected", () => {
    render(
      <SelectionTray
        items={[]}
        onRemove={vi.fn()}
        onMove={vi.fn()}
        onClear={vi.fn()}
        onGenerate={vi.fn()}
        generateVisible
      />,
    );
    expect(screen.queryByTestId("selection-tray")).toBeNull();
  });

  it("shows a compact count and reveals the ordered list on demand", () => {
    const onRemove = vi.fn();
    const onMove = vi.fn();
    render(
      <SelectionTray
        items={[makeEntry(), makeEntry({ id: "synthetic-two", name: "Synthetic Two" })]}
        onRemove={onRemove}
        onMove={onMove}
        onClear={vi.fn()}
        onGenerate={vi.fn()}
        generateVisible
      />,
    );
    expect(trayCount()).toBe("2");
    expect(screen.queryByText(/Synthetic (One|Two)/)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "2 selected — show details" }));
    const names = screen.getAllByText(/Synthetic (One|Two)/);
    expect(names).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: "Move Synthetic One later in the selection" }));
    expect(onMove).toHaveBeenCalledWith("synthetic-one", 1);
    fireEvent.click(screen.getByRole("button", { name: "Remove Synthetic Two from the selection" }));
    expect(onRemove).toHaveBeenCalledWith("synthetic-two");
    fireEvent.click(screen.getByRole("button", { name: "2 selected — hide details" }));
    expect(screen.queryByText(/Synthetic (One|Two)/)).toBeNull();
  });

  it("shows availability warnings for flagged items", () => {
    render(
      <SelectionTray
        items={[makeEntry()]}
        onRemove={vi.fn()}
        onMove={vi.fn()}
        onClear={vi.fn()}
        onGenerate={vi.fn()}
        generateVisible={false}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "1 selected — show details" }));
    expect(
      screen.getByText("no local extension point recorded (manifest/implementation/source link)"),
    ).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Generate master prompt" })).toBeNull();
  });
});
