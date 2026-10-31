// The floating preview is one controller-owned panel. These tests cover its
// presentational contract: a real interactive region, truthful heavy content,
// dismissal listeners and a mounted exit phase.
import { createRef } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { findEntry } from "../../catalog/client";
import type { CatalogEntry } from "../../catalog/types";
import { HoverPreview, hoverPanelRect } from "./HoverPreview";

vi.mock("./PreviewBox", () => ({
  PreviewBox: ({ entry, forceLive }: { entry: CatalogEntry; forceLive?: boolean }) => (
    <div data-testid="mock-preview" data-entry={entry.id} data-force={String(Boolean(forceLive))} />
  ),
}));

const button = findEntry("button") as CatalogEntry;
const heavy = findEntry("react-bits-aurora") as CatalogEntry;
const external = findEntry("shadcn-button") as CatalogEntry;
const anchor = new DOMRect(400, 100, 300, 250);

function renderPreview(entry: CatalogEntry = button, overrides: Record<string, unknown> = {}) {
  const onDismiss = vi.fn();
  const onPanelEnter = vi.fn();
  const onPanelLeave = vi.fn();
  const onExpand = vi.fn();
  render(
    <HoverPreview
      entry={entry}
      anchor={anchor}
      id="preview-panel"
      panelRef={createRef<HTMLElement>()}
      phase="open"
      pinned={false}
      onDismiss={onDismiss}
      onPanelEnter={onPanelEnter}
      onPanelLeave={onPanelLeave}
      onExpand={onExpand}
      {...overrides}
    />,
  );
  return { onDismiss, onPanelEnter, onPanelLeave, onExpand };
}

describe("hoverPanelRect", () => {
  it("opens beside the card when there is room and stays inside the viewport", () => {
    expect(hoverPanelRect(anchor, { width: 1440, height: 1000 })).toEqual({
      left: 714,
      top: 100,
      width: 700,
      height: 470,
    });
  });

  it("falls back below the card when neither side fits", () => {
    expect(hoverPanelRect(new DOMRect(360, 100, 760, 400), { width: 1440, height: 1000 })).toEqual({
      left: 390,
      top: 514,
      width: 700,
      height: 470,
    });
  });

  it("does not replace the card experience on narrow screens", () => {
    expect(hoverPanelRect(anchor, { width: 800, height: 700 })).toBeNull();
  });
});

describe("HoverPreview", () => {
  it("renders an accessible interactive region with the forced live stage", () => {
    renderPreview();
    const panel = screen.getByRole("region", { name: "Enlarged preview of Button" });
    expect(panel.hasAttribute("inert")).toBe(false);
    expect(panel.getAttribute("aria-hidden")).toBeNull();
    expect(panel.getAttribute("data-phase")).toBe("open");
    expect(screen.getByRole("button", { name: "Close enlarged preview" })).toBeTruthy();
    expect(screen.getByTestId("mock-preview").getAttribute("data-entry")).toBe("button");
    expect(screen.getByTestId("mock-preview").getAttribute("data-force")).toBe("true");
  });

  it("never fabricates a preview for external references", () => {
    renderPreview(external);
    expect(screen.queryByTestId("hover-preview")).toBeNull();
  });

  it("closes on Escape, page scroll, outside click and the close button", () => {
    const { onDismiss } = renderPreview();
    const panel = screen.getByRole("region", { name: "Enlarged preview of Button" });

    fireEvent.click(panel);
    expect(onDismiss).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Close enlarged preview" }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onDismiss).toHaveBeenCalledTimes(2);
    fireEvent.scroll(window);
    expect(onDismiss).toHaveBeenCalledTimes(3);
    fireEvent.click(document.body);
    expect(onDismiss).toHaveBeenCalledTimes(4);
  });

  it("reports pointer entry and exit without dismissing on its own", () => {
    const { onDismiss, onPanelEnter, onPanelLeave } = renderPreview();
    const panel = screen.getByRole("region", { name: "Enlarged preview of Button" });

    fireEvent.pointerEnter(panel);
    fireEvent.pointerLeave(panel);
    expect(onPanelEnter).toHaveBeenCalledTimes(1);
    expect(onPanelLeave).toHaveBeenCalledTimes(1);
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it("keeps pinned panels pointer-independent and offers the heavy workspace route", () => {
    const { onDismiss, onPanelEnter, onPanelLeave, onExpand } = renderPreview(heavy, {
      pinned: true,
    });
    const panel = screen.getByRole("region", {
      name: "Enlarged preview of Aurora (React Bits)",
    });
    expect(panel.getAttribute("data-pinned")).toBe("true");
    fireEvent.pointerEnter(panel);
    fireEvent.pointerLeave(panel);
    expect(onPanelEnter).not.toHaveBeenCalled();
    expect(onPanelLeave).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Open full preview" }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(onExpand).toHaveBeenCalledWith("react-bits-aurora");
  });

  it("stays mounted with an exit phase so the closing animation can run", () => {
    renderPreview(button, { phase: "closing" });
    const panel = screen.getByTestId("hover-preview");
    expect(panel.getAttribute("data-phase")).toBe("closing");
    expect(panel.getAttribute("aria-hidden")).toBe("true");
    expect(
      screen.getByRole("button", { name: "Close enlarged preview", hidden: true }).getAttribute("tabindex"),
    ).toBe("-1");
  });
});
