import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TabSheet } from "./TabSheet";

describe("TabSheet (M3 library component)", () => {
  it("renders the WAI-ARIA tabs skeleton with wiring", () => {
    render(
      <TabSheet
        items={[
          { id: "a", label: "Alpha", content: "alpha panel" },
          { id: "b", label: "Beta", content: "beta panel" },
        ]}
      />,
    );
    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(2);
    expect(tabs[0].getAttribute("aria-selected")).toBe("true");
    const panel = screen.getByRole("tabpanel");
    expect(panel.textContent).toContain("alpha panel");
    // aria-controls/labelledby wiring:
    expect(tabs[0].getAttribute("aria-controls")).toBe(panel.id);
    expect(panel.getAttribute("aria-labelledby")).toBe(tabs[0].id);
  });

  it("arrow keys move selection AND focus across tabs (roving tabindex)", () => {
    render(
      <TabSheet
        items={[
          { id: "a", label: "Alpha", content: "alpha panel" },
          { id: "b", label: "Beta", content: "beta panel" },
          { id: "c", label: "Gamma", content: "gamma panel" },
        ]}
      />,
    );
    const alpha = screen.getByRole("tab", { name: "Alpha" }) as HTMLButtonElement;
    const beta = screen.getByRole("tab", { name: "Beta" }) as HTMLButtonElement;
    const gamma = screen.getByRole("tab", { name: "Gamma" }) as HTMLButtonElement;

    alpha.focus();
    expect(document.activeElement).toBe(alpha);

    // Right twice: Beta → Gamma, focus follows selection.
    fireEvent.keyDown(alpha, { key: "ArrowRight" });
    expect(document.activeElement).toBe(beta);
    expect(beta.getAttribute("aria-selected")).toBe("true");
    expect(screen.getByRole("tabpanel").textContent).toContain("beta panel");

    fireEvent.keyDown(beta, { key: "ArrowRight" });
    expect(document.activeElement).toBe(gamma);
    expect(gamma.getAttribute("aria-selected")).toBe("true");
    expect(gamma.getAttribute("tabindex")).toBe("0");
    expect(beta.getAttribute("tabindex")).toBe("-1");
    expect(screen.getByRole("tabpanel").textContent).toContain("gamma panel");

    // Left cycles back; Home/End jump.
    fireEvent.keyDown(gamma, { key: "ArrowLeft" });
    expect(document.activeElement).toBe(beta);
    fireEvent.keyDown(beta, { key: "End" });
    expect(document.activeElement).toBe(gamma);
    fireEvent.keyDown(gamma, { key: "Home" });
    expect(document.activeElement).toBe(alpha);
  });
});
