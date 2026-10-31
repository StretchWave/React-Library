import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { findEntry, entries } from "../../catalog/client";
import type { CatalogEntry } from "../../catalog/types";
import { SHOWCASE_IDS, loadShowcase, peekShowcase } from "../../catalog/showcases";
import { ThemeProvider } from "../../theme/ThemeProvider";
import { PreviewWorkspace } from "./PreviewWorkspace";

function renderWorkspace(entry: CatalogEntry | null, selected = false, onToggleSelection = vi.fn()) {
  const utils = render(
    <ThemeProvider>
      <PreviewWorkspace
        entry={entry}
        selected={selected}
        onToggleSelection={onToggleSelection}
      />
    </ThemeProvider>,
  );
  return { ...utils, onToggleSelection };
}

describe("PreviewWorkspace", () => {
  it("runs a vendored stage with live controls and viewport switches", async () => {
    renderWorkspace(findEntry("react-bits-shiny-text") as CatalogEntry);
    const stage = await screen.findByTestId("preview-stage", {}, { timeout: 8000 });
    expect((await screen.findAllByText("Shiny text shimmer", {}, { timeout: 8000 })).length).toBeGreaterThan(0);
    expect(screen.getByTestId("preview-controls")).toBeTruthy();
    expect(screen.getByTestId("preview-replay")).toBeTruthy();
    expect(stage.getAttribute("data-viewport")).toBe("full");

    const text = screen.getByLabelText("Text") as HTMLInputElement;
    expect(text.value).toBe("Shiny text shimmer");
    fireEvent.change(text, { target: { value: "Fall shimmer" } });
    expect(screen.getByTestId("preview-stage").textContent).toContain("Fall shimmer");

    fireEvent.change(screen.getByLabelText("Stage background mode"), { target: { value: "grid" } });
    expect(screen.getByTestId("preview-stage-wrap").getAttribute("data-stage")).toBe("grid");

    fireEvent.change(screen.getByLabelText("Stage viewport width"), { target: { value: "375" } });
    const frame = screen.getByTestId("preview-stage");
    expect(frame.getAttribute("data-viewport")).toBe("375");
    expect((frame as HTMLElement).style.maxWidth).toBe("375px");
  }, 30_000);

  it("keeps provenance and selection facts in the info rail", async () => {
    const { onToggleSelection } = renderWorkspace(
      findEntry("react-bits-decrypted-text") as CatalogEntry,
    );
    const rail = await screen.findByTestId("preview-rail");
    expect(rail.textContent).toContain("runtime: motion");
    expect(rail.textContent).toContain("Commons Clause");
    expect(rail.textContent).toContain("npx shadcn@latest add");
    expect(rail.textContent).toContain("Related in this source");
    expect(screen.getByTestId("preview-full-record").getAttribute("href")).toBe(
      "#/component/react-bits-decrypted-text",
    );
    fireEvent.click(
      screen.getByRole("checkbox", {
        name: "Select Decrypted Text (React Bits) for the master prompt",
      }),
    );
    expect(onToggleSelection).toHaveBeenCalledWith("react-bits-decrypted-text", true);
  });

  it("shows an honest external card instead of mounting a stage", async () => {
    renderWorkspace(findEntry("shadcn-accordion") as CatalogEntry);
    const honest = await screen.findByTestId("preview-honest");
    expect(honest.textContent).toContain("external");
    expect(screen.queryByTestId("preview-controls")).toBeNull();
    expect(screen.queryByTestId("preview-stage")).toBeNull();
    const official = screen.getByRole("link", { name: "Open official preview ↗" });
    expect((official.getAttribute("href") ?? "").startsWith("http")).toBe(true);
    expect(honest.querySelector('[data-testid="preview-full-record"]')?.getAttribute("href")).toBe(
      "#/component/shadcn-accordion",
    );
  });

  it("reuses the vetted seeded demos in the workspace", async () => {
    renderWorkspace(findEntry("card") as CatalogEntry);
    await screen.findByTestId("preview-rail");
    expect(document.querySelector('[data-demo-id="card"]')).toBeTruthy();
    expect(screen.getByTestId("preview-rail").textContent).toContain("local record");
  });

  it("resolves every runnable local showcase and keeps ids unique", async () => {
    const live = entries.filter(
      (entry) => entry.previewProfile?.previewStatus === "ready" && entry.previewProfile.mode === "live",
    );
    expect(live.length).toBe(71);
    for (const entry of live) expect(await loadShowcase(entry.id)).toBeTruthy();
    for (const seededId of ["alert", "badge", "button", "card", "tabs", "text-input"]) {
      expect(peekShowcase(seededId)).toBeTruthy();
    }
    expect(await loadShowcase("shadcn-accordion")).toBeUndefined();
    expect(new Set(SHOWCASE_IDS).size).toBe(SHOWCASE_IDS.length);
    expect(SHOWCASE_IDS.length).toBe(65);
    for (const entry of entries.filter((candidate) => candidate.heavy)) {
      expect(await loadShowcase(entry.id)).toBeTruthy();
    }
  }, 30_000);
});
