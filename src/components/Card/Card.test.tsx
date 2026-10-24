import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Card } from "./Card";

describe("Card (M3 library component)", () => {
  it("renders optional title, children, and elevation/padding classes", () => {
    render(
      <Card title="Raises" elevation="raised" padding="compact">
        body content
      </Card>,
    );
    expect(screen.getByRole("heading", { name: "Raises" })).toBeTruthy();
    expect(screen.getByText("body content")).toBeTruthy();
    const card = screen.getByLabelText("Raises");
    expect(card.classList.contains("rl-card--raised")).toBe(true);
    expect(card.classList.contains("rl-card--compact")).toBe(true);
  });

  it("defaults to raised/normal and works without a title", () => {
    render(<Card>plain body</Card>);
    const card = screen.getByText("plain body").closest("section") as HTMLElement;
    expect(card.className).toContain("rl-card--raised");
    expect(card.className).toContain("rl-card--normal");
    expect(screen.queryByRole("heading")).toBeNull();
  });
});
