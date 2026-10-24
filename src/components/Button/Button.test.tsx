import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Button } from "./Button";

describe("Button (M3 library component)", () => {
  it("fires onClick and supports disabled", () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Hit</Button>);
    fireEvent.click(screen.getByRole("button", { name: "Hit" }));
    expect(onClick).toHaveBeenCalledTimes(1);

    render(<Button disabled onClick={onClick}>Blocked</Button>);
    const blocked = screen.getByRole("button", { name: "Blocked" });
    expect(blocked).toHaveProperty("disabled", true);
    fireEvent.click(blocked);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("exposes variant and size as documented classes", () => {
    render(<Button variant="secondary" size="lg">Big secondary</Button>);
    const button = screen.getByRole("button", { name: "Big secondary" });
    expect(button.classList.contains("rl-button--secondary")).toBe(true);
    expect(button.classList.contains("rl-button--lg")).toBe(true);
  });
});
