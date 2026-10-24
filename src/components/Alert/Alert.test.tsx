import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Alert } from "./Alert";

describe("Alert (M3 library component)", () => {
  it("renders role=alert with tone class and icon", () => {
    render(<Alert tone="danger" title="Bad news">boom</Alert>);
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain("Bad news");
    expect(alert.className).toContain("rl-alert--danger");
  });

  it("dismissible alerts unmount when dismissed; non-dismissible persist", () => {
    render(
      <>
        <Alert title="Gone soon" dismissible>tap ✕</Alert>
        <Alert title="Stays">no ✕</Alert>
      </>,
    );
    expect(screen.getAllByRole("alert")).toHaveLength(2);
    const first = screen.getAllByRole("alert")[0];
    expect(first.textContent).toContain("Gone soon");
    const dismiss = first.querySelector('button[aria-label="Dismiss alert"]');
    expect(dismiss).toBeTruthy();
    if (!(dismiss instanceof HTMLElement)) throw new Error("dismiss button is not an element");
    fireEvent.click(dismiss);
    const remaining = screen.getAllByRole("alert");
    expect(remaining).toHaveLength(1);
    expect(remaining[0].textContent).toContain("Stays");
  });
});
