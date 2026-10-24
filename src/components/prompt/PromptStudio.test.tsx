// Master-prompt studio tests (M5.5).
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { CatalogEntry } from "../../catalog/types";
import { entries } from "../../catalog/client";
import { PromptStudio } from "./PromptStudio";

const CATALOG_ENTRIES = [...entries];

function studioItems(ids: string[]) {
  return ids
    .map((id) => CATALOG_ENTRIES.find((entry) => entry.id === id))
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));
}

/** A synthetic entry that trips the readiness flags (nothing recorded). */
const FLAGGED_ENTRY: CatalogEntry = {
  id: "synthetic-flagged",
  name: "Synthetic Flagged",
  summary: "A record with no local extension point recorded.",
  category: "buttons",
  themes: ["classic-clean"],
  aliases: [],
  tags: [],
  status: "experimental",
  version: "0.0.1",
  addedDate: "2026-10-24",
  externalDependencies: [],
  props: [],
};

describe("PromptStudio", () => {
  it("renders the generated prompt and copies it to the clipboard", async () => {
    const writeText = vi.fn().mockResolvedValue(true);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    const onBack = vi.fn();
    render(<PromptStudio items={studioItems(["button", "react-bits-split-text"])} onBack={onBack} />);

    const status = screen.getByRole("status");
    expect(status.textContent).toContain("2 components");
    expect(
      (screen.getByRole("button", { name: "Copy master prompt to clipboard" }) as HTMLButtonElement)
        .disabled,
    ).toBe(false);

    fireEvent.click(screen.getByRole("button", { name: "Copy master prompt to clipboard" }));
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    const text = writeText.mock.calls[0]![0] as string;
    expect(text).toContain("# Master prompt — React Library component build");
    expect(text).toContain("npx shadcn@latest add @react-bits/SplitText");
    expect(screen.getByText("Copied ✓")).toBeTruthy();

    // The raw prompt text is readable in the studio itself.
    expect(screen.getByLabelText("Generated master prompt").textContent).toContain("## 2.");
  });

  it("shows readiness warnings when any selection includes flagged entries", () => {
    render(<PromptStudio items={[FLAGGED_ENTRY]} onBack={vi.fn()} />);
    const notes = screen.getByRole("list", { name: "Selection readiness notes" });
    expect(notes.textContent).toContain("Synthetic Flagged:");
    expect(notes.textContent).toContain("no local extension point recorded");
  });

  it("stays honest for an empty selection", () => {
    render(<PromptStudio items={[]} onBack={vi.fn()} />);
    expect(screen.getByRole("status").textContent).toContain("0 components");
    expect(
      (screen.getByRole("button", { name: "Copy master prompt to clipboard" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    expect(screen.getByText(/Nothing selected yet/)).toBeTruthy();
    expect(screen.queryByLabelText("Generated master prompt")).toBeNull();
  });

  it("returns to the selection tray on request", () => {
    const onBack = vi.fn();
    render(<PromptStudio items={studioItems(["button"])} onBack={onBack} />);
    fireEvent.click(screen.getByRole("button", { name: "Back to selection" }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
