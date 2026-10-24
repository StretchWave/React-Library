import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Badge } from "./Badge";

describe("Badge (M3 library component)", () => {
  it("defaults to a neutral md badge and honors tone/size", () => {
    render(
      <>
        <Badge>Default</Badge>
        <Badge tone="accent" size="sm">Tiny</Badge>
        <Badge tone="danger">Stop</Badge>
      </>,
    );
    expect(screen.getByText("Default").className).toContain("rl-badge--neutral");
    const tiny = screen.getByText("Tiny");
    expect(tiny.className).toContain("rl-badge--accent");
    expect(tiny.className).toContain("rl-badge--sm");
    expect(screen.getByText("Stop").className).toContain("rl-badge--danger");
  });
});
