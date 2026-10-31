// Hover previews are interactive enlarged duplicates: they run live demos for
// legibility and accept pointer input, but dismissal stays explicit and local.
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
const external = findEntry("shadcn-button") as CatalogEntry;
const anchor = new DOMRect(400, 100, 300, 250);

function renderPreview(entry: CatalogEntry = button, pinned = false) {
  const onClose = vi.fn();
  const onKeepOpen = vi.fn();
  const onScheduleClose = vi.fn();
  render(
    <HoverPreview
      entry={entry}
      anchor={anchor}
      id="test-preview-panel"
      onClose={onClose}
      onKeepOpen={onKeepOpen}
      onScheduleClose={onScheduleClose}
      pinned={pinned}
    />,
  );
  return { onClose, onKeepOpen, onScheduleClose };
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
    expect(screen.getByRole("button", { name: "Close enlarged preview" })).toBeTruthy();
    expect(screen.getByTestId("mock-preview").getAttribute("data-entry")).toBe("button");
    expect(screen.getByTestId("mock-preview").getAttribute("data-force")).toBe("true");
  });

  it("never fabricates a preview for external references", () => {
    renderPreview(external);
    expect(screen.queryByTestId("hover-preview")).toBeNull();
  });

  it("closes on Escape, page scroll, outside click and the close button", () => {
    const { onClose } = renderPreview();
    const panel = screen.getByRole("region", { name: "Enlarged preview of Button" });

    fireEvent.click(panel);
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Close enlarged preview" }));
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(2);
    fireEvent.scroll(window);
    expect(onClose).toHaveBeenCalledTimes(3);
    fireEvent.click(document.body);
    expect(onClose).toHaveBeenCalledTimes(4);
  });

  it("keeps the panel while the pointer is inside and schedules close outside", () => {
    const { onClose, onKeepOpen, onScheduleClose } = renderPreview();
    const panel = screen.getByRole("region", { name: "Enlarged preview of Button" });

    fireEvent.pointerMove(panel, { pointerId: 1 });
    expect(onKeepOpen).toHaveBeenCalledTimes(1);
    fireEvent.pointerEnter(panel);
    expect(onKeepOpen).toHaveBeenCalledTimes(2);
    fireEvent.pointerLeave(panel);
    expect(onScheduleClose).toHaveBeenCalledTimes(1);
    fireEvent.pointerMove(document, { pointerId: 1 });
    expect(onScheduleClose).toHaveBeenCalledTimes(2);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("pins an explicitly opened panel, focuses it and ignores pointer movement", () => {
    const { onClose, onKeepOpen, onScheduleClose } = renderPreview(button, true);
    const panel = screen.getByRole("region", { name: "Enlarged preview of Button" });

    expect(panel.getAttribute("data-pinned")).toBe("true");
    expect(document.activeElement).toBe(panel);
    fireEvent.pointerEnter(panel);
    fireEvent.pointerLeave(panel);
    fireEvent.pointerMove(document, { pointerId: 1 });
    expect(onKeepOpen).not.toHaveBeenCalled();
    expect(onScheduleClose).not.toHaveBeenCalled();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
