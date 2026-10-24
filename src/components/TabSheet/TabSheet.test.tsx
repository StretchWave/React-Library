import { render, screen } from "@testing-library/react";
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

  it("clicking a tab switches panels; initialTab applies on mount", () => {
    render(
      <TabSheet
        initialTab="b"
        items={[
          { id: "a", label: "Alpha", content: "alpha panel" },
          { id: "b", label: "Beta", content: "beta panel" },
        ]}
      />,
    );
    expect(screen.getByRole("tabpanel").textContent).toContain("beta panel");
    const beta = screen.getByRole("tab", { name: "Beta" });
    expect(beta.getAttribute("aria-selected")).toBe("true");
    const alpha = screen.getByRole("tab", { name: "Alpha" });
    expect(alpha.getAttribute("aria-selected")).toBe("false");
    expect(alpha.getAttribute("tabindex")).toBe("-1");
    beta.click();
    expect(screen.getByRole("tabpanel").textContent).toContain("beta panel");
    const alphaAfter = screen.getByRole("tab", { name: "Alpha" });
    expect(alphaAfter.getAttribute("aria-selected")).toBe("false");
    void alphaAfter;
  });
});
