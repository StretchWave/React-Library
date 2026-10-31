// Keyboard/touch route to the enlarged preview: an explicit per-card control
// pins the panel, and dismissal returns focus to that control rather than
// dropping it on <body>. Expand stays a separate, unchanged action.
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { findEntry } from "../../catalog/client";
import type { CatalogEntry } from "../../catalog/types";
import { GalleryCard } from "./GalleryCard";

vi.mock("./PreviewBox", () => ({
  PreviewBox: ({ entry }: { entry: CatalogEntry }) => (
    <div data-testid="mock-preview" data-entry={entry.id} />
  ),
  previewKind: () => "live",
}));

const button = findEntry("button") as CatalogEntry;

function renderCard() {
  render(
    <ul>
      <GalleryCard entry={button} />
    </ul>,
  );
}

describe("GalleryCard enlarged preview control", () => {
  it("opens a pinned panel and returns focus to the trigger on Escape", () => {
    renderCard();
    const trigger = screen.getByRole("button", { name: "Open enlarged preview of Button" });
    expect(trigger.getAttribute("aria-expanded")).toBe("false");

    fireEvent.click(trigger);

    const panel = screen.getByRole("region", { name: "Enlarged preview of Button" });
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(trigger.getAttribute("aria-controls")).toBe(panel.id);
    expect(panel.getAttribute("data-pinned")).toBe("true");
    expect(document.activeElement).toBe(panel);

    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByRole("region", { name: "Enlarged preview of Button" })).toBeNull();
    expect(document.activeElement).toBe(trigger);
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
  });

  it("closes from the panel's close button and keeps Expand as its own action", () => {
    renderCard();
    fireEvent.click(screen.getByRole("button", { name: "Open enlarged preview of Button" }));

    fireEvent.click(screen.getByRole("button", { name: "Close enlarged preview" }));

    expect(screen.queryByRole("region", { name: "Enlarged preview of Button" })).toBeNull();
    expect(screen.getByRole("button", { name: "Expand preview of Button" })).toBeTruthy();
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Open enlarged preview of Button" }),
    );
  });
});
