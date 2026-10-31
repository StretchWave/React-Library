// Per-component implementation loader (M8.2).
//
// The showcase descriptor (props, controls, defaults, hint) stays in the small
// registry; the actual vendored component is a dynamic import. Opening one
// text effect therefore no longer downloads the WebGL/three.js collection, and
// opening one WebGL effect does not download the other twenty.
//
// The wrapper keeps an explicit loading state and a retry path. A failed chunk
// is recoverable without reloading the page, and the stage error boundary still
// catches render-time exceptions from the mounted component.
import { createElement, useEffect, useState, type ComponentType, type ReactNode } from "react";

// Vendored components have exact prop types; the wrapper forwards them
// unchanged, so the registry treats the loaded component as an opaque raw.
type RawComponent = ComponentType<any>;
type RawModule = { default: RawComponent };
type LoadedState =
  | { phase: "loading" }
  | { phase: "ready"; Component: RawComponent }
  | { phase: "failed"; message: string };

export interface LazyRawOptions {
  /** Loading copy, e.g. "Loading implementation…". */
  label?: string;
}

export function createLazyRaw(
  loader: () => Promise<RawModule>,
  options: LazyRawOptions = {},
): RawComponent {
  const label = options.label ?? "Loading implementation…";

  function LazyRaw(props: Record<string, unknown>): ReactNode {
    const [attempt, setAttempt] = useState(0);
    const [state, setState] = useState<LoadedState>({ phase: "loading" });

    useEffect(() => {
      let active = true;
      setState({ phase: "loading" });
      loader()
        .then((module) => {
          if (!active) return;
          if (typeof module.default !== "function") {
            setState({ phase: "failed", message: "The implementation module has no component export." });
            return;
          }
          setState({ phase: "ready", Component: module.default });
        })
        .catch((error: unknown) => {
          if (!active) return;
          setState({
            phase: "failed",
            message: error instanceof Error ? error.message : String(error),
          });
        });
      return () => {
        active = false;
      };
    }, [attempt]);

    if (state.phase === "failed") {
      return (
        <div className="showcase-load-state is-failed" data-testid="preview-load-error" role="alert">
          <p>
            <strong>The component module could not be loaded.</strong>
          </p>
          <p className="showcase-load-message">{state.message}</p>
          <button type="button" onClick={() => setAttempt((value) => value + 1)}>
            Retry implementation
          </button>
        </div>
      );
    }

    if (state.phase === "loading") {
      return (
        <div className="showcase-load-state" data-testid="showcase-loading" role="status">
          <span className="showcase-load-dot" aria-hidden="true" />
          <span>{label}</span>
        </div>
      );
    }

    return createElement(state.Component, props);
  }

  return LazyRaw;
}
