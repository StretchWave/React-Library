// Per-component implementation loading: a real loading state, a retryable
// failure, and no stale render after unmount.
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ReactElement } from "react";

type Loaded = { default: () => ReactElement };
import { createLazyRaw } from "./lazyRaw";

describe("createLazyRaw", () => {
  it("shows a loading state, then mounts the loaded implementation", async () => {
    let resolveModule: ((module: Loaded) => void) | undefined;
    const loader = vi.fn(
      () =>
        new Promise<Loaded>((resolve) => {
          resolveModule = resolve;
        }),
    );
    const Lazy = createLazyRaw(loader, { label: "Loading widget…" });
    render(<Lazy />);

    expect(screen.getByTestId("showcase-loading").textContent).toContain("Loading widget…");
    resolveModule?.({ default: () => <span>Loaded widget</span> });
    expect(await screen.findByText("Loaded widget")).toBeTruthy();
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it("reports a failed import and retries without a page reload", async () => {
    const loader = vi
      .fn<() => Promise<Loaded>>()
      .mockRejectedValueOnce(new Error("chunk unavailable"))
      .mockResolvedValueOnce({ default: () => <span>Recovered widget</span> });
    const Lazy = createLazyRaw(loader);
    render(<Lazy />);

    const error = await screen.findByTestId("preview-load-error");
    expect(error.textContent).toContain("chunk unavailable");
    fireEvent.click(screen.getByRole("button", { name: "Retry implementation" }));

    expect(await screen.findByText("Recovered widget")).toBeTruthy();
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it("does not set state after the wrapper unmounts mid-import", async () => {
    let resolveModule: ((module: Loaded) => void) | undefined;
    const Lazy = createLazyRaw(
      () =>
        new Promise<Loaded>((resolve) => {
          resolveModule = resolve;
        }),
    );
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { unmount } = render(<Lazy />);
    unmount();
    resolveModule?.({ default: () => <span>Late widget</span> });
    await Promise.resolve();
    expect(errorSpy).not.toHaveBeenCalled();
  });
});
