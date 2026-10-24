import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider, useTheme } from "./ThemeProvider";
import { THEME_STORAGE_KEY } from "./theme";

const THEME_ORDER = [
  "classic-clean",
  "midnight-glass",
  "neon-cyberpunk",
  "brutalist-print",
  "retro-terminal",
  "soft-pastel",
];

function Probe() {
  const { theme, selection, setThemeId, cycleTheme } = useTheme();
  return (
    <div>
      <span data-testid="resolved">{theme.id}</span>
      <span data-testid="selection">{selection}</span>
      <button onClick={() => setThemeId("retro-terminal")}>set-retro</button>
      <button onClick={() => setThemeId("extinct-theme")}>set-extinct</button>
      <button onClick={() => cycleTheme(1)}>cycle-next</button>
    </div>
  );
}

describe("ThemeProvider", () => {
  beforeEach(() => {
    localStorage.clear();
    // jsdom matchMedia (from setup.ts) reports prefers-color-scheme: dark = false,
    // so "auto" resolves to the first light theme in the taxonomy order.
  });

  it("auto (default) resolves to the first light theme and applies tokens to [data-theme]", () => {
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    expect(screen.getByTestId("resolved").textContent).toBe("classic-clean");
    const scope = document.querySelector<HTMLElement>('[data-theme="classic-clean"]');
    expect(scope).toBeTruthy();
    // Taxonomy-driven inline tokens, not hardcoded CSS:
    expect(scope!.style.getPropertyValue("--rl-surface")).toBe("#f7f8fa");
    expect(scope!.style.getPropertyValue("--rl-accent")).toBe("#2563eb");
    expect(scope!.style.getPropertyValue("--rl-radius")).toBe("12px");
  });

  it("selecting an explicit theme switches the scope and persists the choice", () => {
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    fireEvent.click(screen.getByText("set-retro"));
    expect(document.querySelector('[data-theme="retro-terminal"]')).toBeTruthy();
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("retro-terminal");
    expect(document.querySelector('[data-theme="classic-clean"]')).toBeNull();
  });
});

describe("ThemeProvider (localStorage bootstrap)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("revives the persisted theme on remount", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "midnight-glass");
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    expect(screen.getByTestId("resolved").textContent).toBe("midnight-glass");
  });

  it("invalid persisted ids resolve like auto", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "extinct-theme");
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    expect(screen.getByTestId("resolved").textContent).toBe("classic-clean");
  });

  it("cycles forward through taxonomy order via cycle buttons", () => {
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    fireEvent.click(screen.getByText("cycle-next"));
    expect(screen.getByTestId("resolved").textContent).toBe("midnight-glass");
    fireEvent.click(screen.getByText("cycle-next"));
    expect(screen.getByTestId("resolved").textContent).toBe("neon-cyberpunk");
    expect(THEME_ORDER).toHaveLength(6);
  });
});

describe("useTheme guard", () => {
  it("throws with a helpful message outside the provider", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(() => render(<Probe />)).toThrowError(/useTheme must be used inside/);
    vi.restoreAllMocks();
  });
});
