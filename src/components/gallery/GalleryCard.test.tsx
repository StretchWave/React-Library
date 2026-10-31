// Integration tests for the gallery-owned hover controller and the card's
// enlarged-preview control: one panel, stable hover, safe gap crossing, pinned
// focus restoration and no accidental reopen after dismissal.
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { findEntry } from "../../catalog/client";
import type { CatalogEntry } from "../../catalog/types";
import { Gallery } from "./Gallery";

vi.mock("./PreviewBox", () => ({
  PreviewBox: ({ entry }: { entry: CatalogEntry }) => (
    <div data-testid="mock-preview" data-entry={entry.id} />
  ),
  previewKind: () => "live",
}));

const button = findEntry("button") as CatalogEntry;
const cardEntry = findEntry("card") as CatalogEntry;
const noop = () => undefined;

function renderGallery(entries: CatalogEntry[] = [button]) {
  return render(
    <Gallery
      entries={entries}
      totalCount={entries.length}
      filtersActive={false}
      onResetFilters={noop}
      selectedIds={[]}
      selectionItems={[]}
      favoriteIds={[]}
      onToggleSelect={noop}
      onToggleFavorite={noop}
      onOpenEntry={noop}
      onExpandEntry={noop}
      onSelectAllVisible={noop}
      onRemoveSelection={noop}
      onMoveSelection={noop}
      onClearSelection={noop}
      onGeneratePrompt={noop}
      onCompare={noop}
    />,
  );
}

function card(entry: CatalogEntry): HTMLElement {
  const element = document.querySelector<HTMLElement>(`li[data-entry-id="${entry.id}"]`);
  if (!element) throw new Error(`missing card ${entry.id}`);
  return element;
}

const cardRect = { left: 0, top: 100, right: 300, bottom: 340, width: 300, height: 240, x: 0, y: 100 };
const panelRect = { left: 314, top: 100, right: 1014, bottom: 570, width: 700, height: 470, x: 314, y: 100 };

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function mockRects(): void {
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
    if (this.classList.contains("hover-preview")) return panelRect as DOMRect;
    if (this.tagName === "LI") return cardRect as DOMRect;
    return { left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0, x: 0, y: 0 } as DOMRect;
  });
}

function advance(ms: number): void {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

function enter(entry: CatalogEntry, x = 20, y = 200): void {
  fireEvent.pointerOver(card(entry), { pointerType: "mouse", clientX: x, clientY: y });
}

describe("gallery hover preview controller", () => {
  it("opens after a stable hover and closes only after leaving both surfaces", () => {
    vi.useFakeTimers();
    mockRects();
    renderGallery();

    enter(button);
    advance(200);
    expect(screen.queryByTestId("hover-preview")).toBeNull();
    advance(150);
    const panel = screen.getByTestId("hover-preview");
    expect(panel.getAttribute("data-phase")).toBe("open");

    // Crossing the 14px gap: the pointer is outside the card but inside the
    // combined corridor, and entering the panel cancels the close timer.
    fireEvent.pointerOut(card(button));
    fireEvent.pointerMove(document, { pointerType: "mouse", clientX: 308, clientY: 200 });
    advance(250);
    expect(screen.getByTestId("hover-preview")).toBeTruthy();
    fireEvent.pointerEnter(panel);

    fireEvent.pointerOut(panel);
    fireEvent.pointerMove(document, { pointerType: "mouse", clientX: 1100, clientY: 800 });
    advance(260);
    expect(screen.getByTestId("hover-preview").getAttribute("data-phase")).toBe("closing");
    advance(200);
    expect(screen.queryByTestId("hover-preview")).toBeNull();
  });

  it("cancels a pending open when the pointer leaves early", () => {
    vi.useFakeTimers();
    mockRects();
    renderGallery();

    enter(button);
    advance(100);
    fireEvent.pointerOut(card(button));
    advance(500);
    expect(screen.queryByTestId("hover-preview")).toBeNull();
  });

  it("keeps exactly one panel when moving quickly between cards", () => {
    vi.useFakeTimers();
    mockRects();
    renderGallery([button, cardEntry]);

    enter(button);
    advance(350);
    expect(screen.getAllByTestId("hover-preview")).toHaveLength(1);

    enter(cardEntry);
    advance(350);
    const panels = screen.getAllByTestId("hover-preview");
    expect(panels).toHaveLength(1);
    expect(panels[0].getAttribute("aria-label")).toBe("Enlarged preview of Card");
  });

  it("pins from the card control, traps focus in the panel and restores it on Escape", () => {
    mockRects();
    renderGallery();
    const trigger = screen.getByRole("button", { name: "Open enlarged preview of Button" });
    expect(trigger.getAttribute("aria-expanded")).toBe("false");

    fireEvent.click(trigger);

    const panel = screen.getByRole("region", { name: "Enlarged preview of Button" });
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(trigger.getAttribute("aria-controls")).toBe(panel.id);
    expect(panel.getAttribute("data-pinned")).toBe("true");
    expect(document.activeElement).toBe(panel);

    fireEvent.keyDown(document, { key: "Escape" });
    expect(document.activeElement).toBe(trigger);
    expect(screen.queryByRole("region", { name: "Enlarged preview of Button" })).toBeNull();
    // The panel is still mounted for its exit animation.
    expect(screen.getByTestId("hover-preview").getAttribute("data-phase")).toBe("closing");
  });

  it("closes from the panel's close button and keeps Expand as its own action", async () => {
    mockRects();
    renderGallery();
    const trigger = screen.getByRole("button", { name: "Open enlarged preview of Button" });
    fireEvent.click(trigger);

    fireEvent.click(screen.getByRole("button", { name: "Close enlarged preview" }));

    expect(document.activeElement).toBe(trigger);
    await waitFor(() => expect(screen.queryByTestId("hover-preview")).toBeNull());
    expect(trigger.getAttribute("aria-label")).toBe("Open enlarged preview of Button");
    expect(screen.getByRole("button", { name: "Expand preview of Button" })).toBeTruthy();
  });

  it("does not reopen a dismissed panel while the pointer is already over the card", () => {
    vi.useFakeTimers();
    mockRects();
    renderGallery();
    fireEvent.click(screen.getByRole("button", { name: "Open enlarged preview of Button" }));
    fireEvent.keyDown(document, { key: "Escape" });
    advance(250);
    expect(screen.queryByTestId("hover-preview")).toBeNull();

    // The panel's unmount exposes the card under the pointer; a synthetic
    // pointerenter must not reopen it inside the dismissal guard.
    enter(button);
    advance(400);
    expect(screen.queryByTestId("hover-preview")).toBeNull();

    // After the guard, a deliberate re-entry works normally.
    advance(400);
    fireEvent.pointerOut(card(button));
    enter(button);
    advance(350);
    expect(screen.getByTestId("hover-preview")).toBeTruthy();
  });

  it("finishes the exit when a dismissal races rapid card switching", () => {
    vi.useFakeTimers();
    mockRects();
    renderGallery([button, cardEntry]);
    enter(button);
    advance(350);
    expect(screen.getByTestId("hover-preview")).toBeTruthy();

    // Entering a second card starts the old panel's exit and schedules a new
    // open. A page scroll then dismisses everything while it is closing; the
    // panel must still unmount rather than stick in data-phase="closing".
    enter(cardEntry);
    advance(100);
    fireEvent.pointerOut(card(cardEntry));
    fireEvent.scroll(window);
    const closing = screen.getByTestId("hover-preview");
    expect(closing.getAttribute("data-phase")).toBe("closing");
    fireEvent.pointerEnter(closing);
    advance(250);
    expect(screen.queryByTestId("hover-preview")).toBeNull();
  });

  it("cancels every timer when the gallery unmounts", () => {
    vi.useFakeTimers();
    mockRects();
    const { unmount } = renderGallery();
    enter(button);
    unmount();
    advance(1000);
    expect(document.querySelector('[data-testid="hover-preview"]')).toBeNull();
  });
});
