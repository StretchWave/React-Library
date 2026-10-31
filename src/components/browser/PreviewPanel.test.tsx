import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { findEntry } from "../../catalog/client";
import type { CatalogEntry } from "../../catalog/types";
import { ThemeProvider } from "../../theme/ThemeProvider";
import { PreviewPanel } from "./PreviewPanel";

function mockClipboard() {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText },
    configurable: true,
  });
  return writeText;
}

describe("PreviewPanel copy-usage", () => {
  it("copies a usage snippet derived from catalog links", async () => {
    const writeText = mockClipboard();
    render(
      <ThemeProvider>
        <PreviewPanel entry={findEntry("button") as CatalogEntry} />
      </ThemeProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Copy usage snippet for Button" }));
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    const snippet = writeText.mock.calls[0]![0] as string;
    expect(snippet).toContain('import { Button } from "src/components/Button/Button"');
    expect(snippet).toContain("<Button");
    expect(screen.getByText("Copied ✓")).toBeTruthy();
  });

  it("falls back to recorded implementation paths for vendored entries", async () => {
    const writeText = mockClipboard();
    const entry = findEntry("shadcn-button") as CatalogEntry;
    render(
      <ThemeProvider>
        <PreviewPanel entry={entry} />
      </ThemeProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Copy usage snippet for Button (shadcn)" }));
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    const snippet = writeText.mock.calls[0]![0] as string;
    expect(snippet).toContain(
      `import { Buttonshadcn } from "${entry.implementation?.[0]?.replace(/\.tsx$/, "")}"`,
    );
  });

  it("uses a slice-free label when links are absent", async () => {
    const writeText = mockClipboard();
    const ghost = { ...(findEntry("button") as CatalogEntry), id: "ghost", name: "GhostThing", links: undefined };
    render(
      <ThemeProvider>
        <PreviewPanel entry={ghost} />
      </ThemeProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Copy usage snippet for GhostThing" }));
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    expect(writeText.mock.calls[0]![0]).toContain("// GhostThing (no source link registered");
  });
});
