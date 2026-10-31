// Modal contract for the full preview: dim/blur layer, focus trap, background
// inertness, scroll lock, Escape, exit animation and full restoration.
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { findEntry } from "../../catalog/client";
import type { CatalogEntry } from "../../catalog/types";
import { ExpandedPreview } from "./ExpandedPreview";

const external = findEntry("shadcn-button") as CatalogEntry;

function renderOverlay(entry: CatalogEntry | null) {
  const onClose = vi.fn();
  const onToggleSelection = vi.fn();
  const utils = render(
    <ExpandedPreview
      entry={entry}
      selected={false}
      onToggleSelection={onToggleSelection}
      onClose={onClose}
    />,
  );
  return { ...utils, onClose, onToggleSelection };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ExpandedPreview", () => {
  it("opens an inert, scroll-locked dialog and traps focus", async () => {
    const opener = document.createElement("button");
    opener.textContent = "opener";
    document.body.appendChild(opener);
    opener.focus();

    const { container } = renderOverlay(external);
    const dialog = screen.getByRole("dialog", { name: "Button (shadcn)" });
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(document.body.style.overflow).toBe("hidden");
    expect(container.hasAttribute("inert")).toBe(true);
    expect(opener.hasAttribute("inert")).toBe(true);

    const close = within(dialog).getByRole("button", { name: "Close" });
    await waitFor(() => expect(document.activeElement).toBe(close));

    const focusables = [...dialog.querySelectorAll<HTMLElement>("button, a[href]")];
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    last.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(document.activeElement).toBe(first);
    first.focus();
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(last);

    opener.remove();
  });

  it("keeps the exit phase mounted, then restores scroll, inertness and focus", async () => {
    const opener = document.createElement("button");
    document.body.appendChild(opener);
    opener.focus();

    const props = {
      selected: false,
      onToggleSelection: vi.fn(),
      onClose: vi.fn(),
    };
    const { container, rerender } = render(<ExpandedPreview entry={external} {...props} />);
    expect(screen.getByTestId("expanded-preview").getAttribute("data-phase")).toBe("open");

    rerender(<ExpandedPreview entry={null} {...props} />);
    expect(screen.getByTestId("expanded-preview").getAttribute("data-phase")).toBe("closing");
    expect(document.body.style.overflow).toBe("hidden");

    await waitFor(() => expect(screen.queryByTestId("expanded-preview")).toBeNull());
    // Scroll/inert cleanup runs in the unmount effect, one commit after the
    // element leaves the DOM; assert the restored state rather than the
    // transient frame between the two.
    await waitFor(() => expect(document.body.style.overflow).toBe(""));
    await waitFor(() => expect(container.hasAttribute("inert")).toBe(false));
    await waitFor(() => expect(opener.hasAttribute("inert")).toBe(false));
    expect(document.activeElement).toBe(opener);
    opener.remove();
  });

  it("closes on Escape and on a backdrop click", async () => {
    const { onClose } = renderOverlay(external);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByTestId("expanded-backdrop"));
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
