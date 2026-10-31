// Preview workspace (M6.2; M7.4 visual redesign; M7.2 experience refinement):
// a dedicated full-stage preview where the component — not the chrome — is the
// main event. Runnable entries render exclusively through
// src/catalog/showcases — vendored third-party code never executes in the app
// outside those reviewed wrappers. Entries without a runnable preview show an
// honest kind card with the official link and the agent retrieval path. The
// canvas keeps its own stage background (neutral/inverted/grid) so the
// application theme never recolors a component preview. All styling uses
// --rl-* tokens only.
// M7.2 hierarchy: the rail keeps the component identity, the selection toggle,
// the classification chips and the verified controls first; provenance facts
// (source, license, retrieval, dependencies, files, related) collapse behind
// an accessible <details> so they never compete with the stage.
// M7.2 behavior treatment: scroll-triggered entries get an inner-scrollable
// wrap so the viewport entrance can be triggered without scrolling the app.
import { Component, useEffect, useRef, useState, type ReactNode } from "react";
import {
  aestheticById,
  attributeById,
  behaviorById,
  categoryById,
  entries,
  sourceById,
} from "../../catalog/client";
import { entryTypeOf, type CatalogEntry } from "../../catalog/types";
import {
  loadShowcase,
  peekShowcase,
  type Showcase,
  type ShowcaseControl,
  type ShowcaseValues,
} from "../../catalog/showcases";
import { statusChipClass } from "../browser/statusChip";
import { snapshotUrl } from "../../catalog/preview";

type StageMode = "neutral" | "inverted" | "grid";
type Viewport = "full" | "1280" | "768" | "375";

const VIEWPORTS: Array<{ id: Viewport; label: string; width: string | null }> = [
  { id: "full", label: "Full", width: null },
  { id: "1280", label: "1280px", width: "1280px" },
  { id: "768", label: "768px", width: "768px" },
  { id: "375", label: "375px", width: "375px" },
];

export interface PreviewWorkspaceProps {
  entry: CatalogEntry | null;
  /** M5.4-style selection toggle support (same wording as the detail pane). */
  selected?: boolean;
  onToggleSelection?: (id: string, next: boolean) => void;
}

function previewKindOf(entry: CatalogEntry, showcase: Showcase | undefined): string {
  if (showcase) return "local-demo";
  return entry.preview?.type ?? "none";
}

/** Honest explanation for entries without a runnable preview. */
function honestReason(entry: CatalogEntry): string {
  if (entry.preview?.note) return entry.preview.note;
  switch (entry.preview?.type) {
    case "source-link":
      return "This component's official variant cannot be re-hosted honestly on a catalog page, so the live view lives on the official demo page (link below).";
    case "external":
      return "The official demo lives outside this catalog and is not panel-embeddable here; the link opens it in its own page.";
    default:
      return "No runnable preview is registered for this entry yet.";
  }
}

/** Honest failure card when a stage component throws at mount (for example
 *  when WebGL2 is unavailable): the vendored source still ships to the target
 *  project; nothing on-stage executes off-machine. */
class StageErrorBoundary extends Component<
  { entry: CatalogEntry; onRetry: () => void; children: ReactNode },
  { error: string }
> {
  state = { error: "" };
  static getDerivedStateFromError(error: unknown) {
    return { error: error instanceof Error ? `${error.name}: ${error.message}` : String(error) };
  }
  render() {
    const { entry, onRetry } = this.props;
    if (!this.state.error) return this.props.children;
    return (
      <div className="workspace-honest" data-testid="preview-stage-error">
        <h2>{entry.name}</h2>
        <p className="workspace-honest-kind">
          The live stage threw on this machine: <strong>{this.state.error}</strong>
        </p>
        <p className="workspace-honest-reason">
          Runtime previews degrade honestly when the browser lacks WebGL2. The vendored source still ships to the target project through the export path; nothing ran outside this catalog.
        </p>
        <div className="workspace-honest-actions">
          <button type="button" onClick={onRetry}>
            Retry stage
          </button>
          {entry.sourceUrl ? (
            <a href={entry.sourceUrl} target="_blank" rel="noreferrer noopener">
              Official source ↗
            </a>
          ) : null}
          <a href={`#/component/${entry.id}`} data-testid="preview-full-record">
            Full record ↗
          </a>
        </div>
      </div>
    );
  }
}

interface ShowcaseLoadState {
  status: "loading" | "ready" | "failed";
  showcase?: Showcase;
  error?: string;
}

/** Loads only the selected group, converting a failed chunk import into a
 *  retryable state instead of a blank stage. */
function useEntryShowcase(entry: CatalogEntry): ShowcaseLoadState & { retry: () => void } {
  const [retryKey, setRetryKey] = useState(0);
  const [state, setState] = useState<ShowcaseLoadState>(() => {
    const cached = peekShowcase(entry.id);
    return cached ? { status: "ready", showcase: cached } : { status: "loading" };
  });

  useEffect(() => {
    let active = true;
    const cached = peekShowcase(entry.id);
    if (cached) {
      setState({ status: "ready", showcase: cached });
      return;
    }
    setState({ status: "loading" });
    void loadShowcase(entry.id)
      .then((showcase) => {
        if (!active) return;
        setState(
          showcase
            ? { status: "ready", showcase }
            : { status: "failed", error: "No runnable showcase is registered for this entry." },
        );
      })
      .catch((error: unknown) => {
        if (!active) return;
        setState({
          status: "failed",
          error: error instanceof Error ? error.message : String(error),
        });
      });
    return () => {
      active = false;
    };
  }, [entry.id, retryKey]);

  return { ...state, retry: () => setRetryKey((value) => value + 1) };
}

/** Detects whether the mounted stage produced a usable surface (canvas,
 *  image, svg or text) and whether its WebGL context is alive. */
function ShowcaseStage({
  entry,
  showcase,
  values,
  onRetry,
}: {
  entry: CatalogEntry;
  showcase: Showcase;
  values: ShowcaseValues;
  onRetry: () => void;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [phase, setPhase] = useState<"mounting" | "ready" | "restricted">("mounting");
  const [restriction, setRestriction] = useState("");
  const requiresWebGL =
    entry.runtime === "webgl" ||
    (entry.previewProfile?.requires ?? []).some((requirement) => requirement === "webgl" || requirement === "gpu");

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const inspect = () => {
      if (cancelled) return;
      const host = hostRef.current;
      if (!host) {
        if (attempts++ < 20) timer = setTimeout(inspect, 80);
        return;
      }
      const stillLoading = host.querySelector('[data-testid="showcase-loading"]');
      const failed = host.querySelector('[data-testid="preview-load-error"]');
      if (failed) {
        setPhase("ready");
        return;
      }
      if (stillLoading && attempts++ < 60) {
        timer = setTimeout(inspect, 100);
        return;
      }
      const canvases = [...host.querySelectorAll("canvas")];
      for (const canvas of canvases) {
        let lost = false;
        try {
          const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
          lost = Boolean(gl?.isContextLost?.());
          if (lost || (entry.heavy && requiresWebGL && !gl)) {
            setPhase("restricted");
            setRestriction(
              lost
                ? "The WebGL context was lost. Reload the stage to recreate it."
                : "This machine could not create a WebGL context. The live GPU effect cannot run here; the captured snapshot remains the honest fallback.",
            );
            return;
          }
        } catch {
          // A canvas that refuses inspection is handled by the audit, not by
          // treating the whole stage as broken.
        }
      }
      const meaningful =
        canvases.length > 0 ||
        Boolean(host.querySelector("img, svg")) ||
        (host.textContent ?? "").trim().length > 0;
      if (!meaningful && attempts++ < 12) {
        timer = setTimeout(inspect, 100);
        return;
      }
      setPhase("ready");
    };

    timer = setTimeout(inspect, 40);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [entry.heavy, requiresWebGL, showcase]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const canvases = [...host.querySelectorAll("canvas")];
    const onLost = (event: Event) => {
      event.preventDefault();
      setRestriction("The WebGL context was lost. Reload the stage to recreate it.");
      setPhase("restricted");
    };
    for (const canvas of canvases) canvas.addEventListener("webglcontextlost", onLost);
    return () => {
      for (const canvas of canvases) canvas.removeEventListener("webglcontextlost", onLost);
    };
  }, [phase, showcase]);

  return (
    <div ref={hostRef} className="workspace-stage-live" data-preview-phase={phase}>
      <showcase.Component {...values} />
      {phase === "restricted" && snapshotUrl(entry) ? (
        <img
          className="workspace-stage-fallback"
          src={snapshotUrl(entry)}
          alt={`Captured fallback of ${entry.name}`}
        />
      ) : null}
      {phase === "mounting" ? (
        <div className="workspace-stage-status" data-testid="preview-stage-status" role="status">
          <span className="workspace-stage-pulse" aria-hidden="true" />
          {entry.heavy ? "Initializing renderer…" : "Mounting component…"}
        </div>
      ) : null}
      {phase === "restricted" ? (
        <div className="workspace-stage-status is-restricted" data-testid="preview-stage-status" role="alert">
          <p>{restriction}</p>
          <button type="button" onClick={onRetry}>
            Reload stage
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function PreviewWorkspace({ entry, selected, onToggleSelection }: PreviewWorkspaceProps) {
  if (!entry) {
    return (
      <main className="workspace-shell" data-testid="preview-workspace" aria-label="Preview workspace">
        <div className="workspace-empty">
          <h2>Preview workspace</h2>
          <p>Open a component from the gallery or the catalog browser to preview it here.</p>
          <a href="#/gallery">Back to gallery</a>
        </div>
      </main>
    );
  }

  return (
    <WorkspaceShell
      key={entry.id}
      entry={entry}
      selected={selected}
      onToggleSelection={onToggleSelection}
    />
  );
}

interface WorkspaceShellProps {
  entry: CatalogEntry;
  selected?: boolean;
  onToggleSelection?: (id: string, next: boolean) => void;
}

/** Keyed by entry id so stage state resets when the deep link changes. */
/** M7.1 immersive stage: an interaction cue derived from the entry's verified
 *  behavior classification (taxonomy/behaviors.json) so the user knows how the
 *  stage wants to be used without leaving the canvas. Ordered by input
 *  priority: a component that both follows the cursor and fires on click gets
 *  both cues, capped at two to keep the stage quiet. */
const CUES: Array<[string, string]> = [
  ["cursor-reactive", "Move the pointer across the stage — the effect follows the cursor."],
  ["draggable", "Drag elements on the stage, release, and press Replay to reset."],
  ["gesture", "Pinch, drag or wheel over the stage."],
  ["interactive-3d", "Drag the stage to orbit; scroll to zoom where supported."],
  ["click", "Click on the stage to fire the effect."],
  ["hover", "Rest the pointer over the component to trigger its hover transition."],
  ["interactive-text", "Hover, click or type on the text to trigger the effect."],
  ["interactive-nav", "Interact with the navigation elements to reveal their transitions."],
  ["scroll", "Scroll inside the stage to trigger the viewport entrance."],
  ["stateful", "Use the component's controls — the transition runs on state change."],
  ["auto", "The animation plays on its own; press Replay to restart it."],
];

function stageInteractionCue(entry: CatalogEntry): string | null {
  const behaviors = entry.behaviors ?? [];
  const cues: string[] = [];
  for (const [behavior, cue] of CUES) {
    if (behaviors.length === 0) break;
    if (behaviors.includes(behavior)) cues.push(cue);
    if (cues.length === 2) break;
  }
  if (cues.length === 0) return null;
  return cues.join(" ");
}

function WorkspaceShell({ entry, selected, onToggleSelection }: WorkspaceShellProps) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const stageModeTouched = useRef(false);
  const showcaseState = useEntryShowcase(entry);
  const showcase = showcaseState.status === "ready" ? showcaseState.showcase : undefined;
  const [viewport, setViewport] = useState<Viewport>("full");
  const [stageMode, setStageMode] = useState<StageMode>("neutral");
  const [replayKey, setReplayKey] = useState(0);
  const [values, setValues] = useState<ShowcaseValues>({});

  // The group loads asynchronously; seed canvas mode and control defaults when
  // its descriptor arrives, without overwriting a user's stage choice.
  useEffect(() => {
    if (!showcase) return;
    if (!stageModeTouched.current) setStageMode(showcase.stage ?? "neutral");
    const initial: ShowcaseValues = {};
    for (const control of showcase.controls ?? []) initial[control.id] = control.default;
    setValues(initial);
  }, [showcase]);

  const related = entries
    .filter((candidate) => candidate.source && entry.source && candidate.source === entry.source && candidate.id !== entry.id)
    .sort(
      (a, b) =>
        Number(b.category === entry.category) - Number(a.category === entry.category) ||
        a.id.localeCompare(b.id),
    )
    .slice(0, 6);

  const runnable = Boolean(showcase);
  const kind = showcaseState.status === "loading" ? "loading" : previewKindOf(entry, showcase);
  const categoryLabel = categoryById(entry.category)?.label ?? entry.category;
  const viewportWidth = VIEWPORTS.find((candidate) => candidate.id === viewport)?.width ?? null;
  const cue = stageInteractionCue(entry);

  function resetControls(): void {
    const initial: ShowcaseValues = {};
    for (const control of showcase?.controls ?? []) initial[control.id] = control.default;
    setValues(initial);
  }

  function setControl(id: string, value: string | number | boolean): void {
    setValues((prev) => ({ ...prev, [id]: value }));
  }

  function toggleFullscreen(): void {
    const stage = stageRef.current;
    if (!stage) return;
    if (document.fullscreenElement && typeof document.exitFullscreen === "function") {
      void document.exitFullscreen().catch(() => {
        // Leaving fullscreen is best-effort; the inline canvas stays usable.
      });
      return;
    }
    try {
      const request = stage.requestFullscreen?.();
      if (request && typeof request.catch === "function") {
        request.catch(() => {
          // Denied or unsupported (for example kiosk mode): the inline canvas
          // remains the honest fallback; no state is changed.
        });
      }
    } catch {
      // Some engines throw synchronously when fullscreen is unavailable; the
      // inline canvas remains usable.
    }
  }

  function renderControl(control: ShowcaseControl) {
    const inputId = `preview-control-${control.id}`;
    const value = values[control.id] ?? control.default;
    const label = (
      <label htmlFor={inputId} className="workspace-control-label">
        {control.label}
      </label>
    );
    let field;
    if (control.type === "text") {
      field = (
        <input
          id={inputId}
          type="text"
          value={String(value)}
          onChange={(event) => setControl(control.id, event.target.value)}
          aria-label={control.label}
        />
      );
    } else if (control.type === "number") {
      field = (
        <input
          id={inputId}
          type="number"
          value={Number(value)}
          min={control.min}
          max={control.max}
          step={control.step}
          onChange={(event) => setControl(control.id, Number(event.target.value))}
          aria-label={control.label}
        />
      );
    } else if (control.type === "boolean") {
      field = (
        <input
          id={inputId}
          type="checkbox"
          checked={Boolean(value)}
          onChange={(event) => setControl(control.id, event.target.checked)}
          aria-label={control.label}
        />
      );
    } else {
      field = (
        <select
          id={inputId}
          value={String(value)}
          onChange={(event) => setControl(control.id, event.target.value)}
          aria-label={control.label}
        >
          {(control.options ?? []).map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      );
    }
    return (
      <div key={control.id} className="workspace-control">
        {label}
        {field}
      </div>
    );
  }

  const isScrollStage = (entry.behaviors ?? []).includes("scroll");

  return (
    <main className="workspace-shell" data-testid="preview-workspace" aria-label={`Preview workspace for ${entry.name}`}>
      <section className="workspace-main" aria-label="Live preview stage">        <div className="workspace-toolbar">
          <label className="workspace-toolbar-field">
            Stage
            <select
              data-testid="preview-stage-mode"
              aria-label="Stage background mode"
              value={stageMode}
              onChange={(event) => {
                stageModeTouched.current = true;
                setStageMode(event.target.value as StageMode);
              }}
            >
              <option value="neutral">neutral</option>
              <option value="inverted">inverted</option>
              <option value="grid">grid</option>
            </select>
          </label>
          <label className="workspace-toolbar-field">
            Viewport
            <select
              data-testid="preview-viewport-select"
              aria-label="Stage viewport width"
              value={viewport}
              onChange={(event) => setViewport(event.target.value as Viewport)}
            >
              {VIEWPORTS.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="workspace-replay"
            data-testid="preview-replay"
            onClick={() => {
              setReplayKey((current) => current + 1);
              // Scroll-triggered stages: reset the inner scroll position so a
              // replay genuinely re-runs the viewport entrance.
              stageRef.current?.scrollTo({ top: 0 });
            }}
          >
            Replay
          </button>
          <button
            type="button"
            className="workspace-replay"
            onClick={toggleFullscreen}
            aria-label="Toggle fullscreen preview"
            disabled={!runnable}
          >
            Fullscreen
          </button>
        </div>
        {showcaseState.status === "loading" ? (
          <div
            className="workspace-stage-wrap"
            data-stage={stageMode}
            data-testid="preview-stage-wrap"
          >
            <div className="workspace-stage-loading" data-testid="preview-stage-loading" role="status">
              <span className="workspace-stage-pulse" aria-hidden="true" />
              Loading preview implementation…
            </div>
          </div>
        ) : runnable && showcase ? (
          <>
            <div
              className="workspace-stage-wrap"
              data-stage={stageMode}
              data-scroll={isScrollStage && viewport === "full" ? "true" : undefined}
              data-testid="preview-stage-wrap"
              ref={stageRef}
            >
              <div
                className="workspace-stage-frame"
                key={replayKey}
                data-viewport={viewport}
                data-testid="preview-stage"
                style={viewportWidth ? { maxWidth: viewportWidth } : undefined}
              >
                <StageErrorBoundary
                  key={`boundary-${replayKey}`}
                  entry={entry}
                  onRetry={() => setReplayKey((current) => current + 1)}
                >                    <ShowcaseStage
                    key={`stage-${replayKey}`}
                    entry={entry}
                    showcase={showcase}
                    values={values}
                    onRetry={() => setReplayKey((current) => current + 1)}
                  />
                </StageErrorBoundary>
              </div>
            </div>
            <p className="workspace-hint" data-testid="preview-interaction-cue">
              {cue ?? showcase.hint ?? "Press Replay to restart the animation."}
            </p>
          </>
        ) : (
          <div className="workspace-honest" data-testid="preview-honest">
            <h2>{entry.name}</h2>
            <p className="workspace-honest-kind">
              Preview kind: <strong>{kind}</strong>
              {entry.runtime ? ` · runtime: ${entry.runtime}` : ""}
              {entry.heavy ? " · heavy" : ""}
            </p>
            <p className="workspace-honest-reason">
              {showcaseState.status === "failed" && showcaseState.error
                ? showcaseState.error
                : honestReason(entry)}
            </p>
            <div className="workspace-honest-actions">
              {showcaseState.status === "failed" ? (
                <button type="button" onClick={showcaseState.retry}>
                  Retry preview
                </button>
              ) : null}
              {entry.preview?.url ? (
                <a href={entry.preview.url} target="_blank" rel="noreferrer noopener">
                  Open official preview ↗
                </a>
              ) : null}
              {entry.sourceUrl ? (
                <a href={entry.sourceUrl} target="_blank" rel="noreferrer noopener">
                  Official source ↗
                </a>
              ) : null}
              <a href={`#/component/${entry.id}`} data-testid="preview-full-record">
                Full record ↗
              </a>
            </div>
          </div>
        )}
      </section>

      <aside className="workspace-rail" data-testid="preview-rail" aria-label="Component information">
        <div className="workspace-title-row">
          <h2 className="workspace-title">{entry.name}</h2>
          <span className={`status-chip ${statusChipClass(entry)}`}>{entry.status}</span>
        </div>
        <p className="workspace-idline">
          <code className="inline-code">{entry.id}</code>
        </p>
        {onToggleSelection ? (
          <label className="workspace-select-toggle">
            <input
              type="checkbox"
              checked={Boolean(selected)}
              onChange={(event) => onToggleSelection(entry.id, event.target.checked)}
              aria-label={`Select ${entry.name} for the master prompt`}
            />
            <span>select for prompt</span>
          </label>
        ) : null}

        <div className="chip-row" aria-label="Classification chips">
          <span className="neutral-chip">{categoryLabel}</span>
          {entry.runtime ? <span className="neutral-chip">runtime: {entry.runtime}</span> : null}
          {entry.heavy ? <span className="neutral-chip">heavy</span> : null}
          <span className="neutral-chip">preview: {kind}</span>
          <span className="neutral-chip">{entryTypeOf(entry) === "external" ? "external record" : "local record"}</span>
        </div>

        {(entry.behaviors ?? []).length > 0 ? (
          <div className="chip-row" aria-label="Interaction behaviors" data-testid="preview-behavior-chips">
            {(entry.behaviors ?? []).map((id) => (
              <span key={id} className="aesthetic-chip" data-behavior={id}>
                {behaviorById(id)?.label ?? id}
              </span>
            ))}
          </div>
        ) : null}

        {entry.summary ? <p className="workspace-summary">{entry.summary}</p> : null}

        {runnable && showcase ? (
          <section
            className="workspace-controls"
            data-testid="preview-controls"
            aria-label="Preview controls"
          >
            <h3 className="workspace-controls-title">Controls</h3>
            {(showcase.controls ?? []).length > 0 ? (
              <>
                {(showcase.controls ?? []).map((control) => renderControl(control))}
                <button type="button" className="workspace-reset" onClick={resetControls}>
                  Reset controls
                </button>
              </>
            ) : (
              <p className="workspace-controls-empty">This demo has no tunable controls.</p>
            )}
          </section>
        ) : null}

        {(entry.aesthetics ?? []).length > 0 ? (
          <div className="chip-row" aria-label="Visual aesthetics">
            {(entry.aesthetics ?? []).map((id) => (
              <span key={id} className="aesthetic-chip">
                {aestheticById(id)?.label ?? id}
              </span>
            ))}
          </div>
        ) : null}

        {(entry.attributes ?? []).length > 0 ? (
          <div className="chip-row" aria-label="Technical attributes">
            {(entry.attributes ?? []).map((id) => (
              <span key={id} className="neutral-chip">
                {attributeById(id)?.label ?? id}
              </span>
            ))}
          </div>
        ) : null}

        <details className="workspace-details" data-testid="preview-details">
          <summary>Provenance & retrieval</summary>
          <div className="workspace-details-body">
            {entry.source ? (
          <div className="workspace-fact">
            <span className="workspace-fact-label">Source</span>
            <span>
              {sourceById(entry.source)?.name ?? entry.source}
              {entry.sourceUrl ? (
                <>
                  {" — "}
                  <a href={entry.sourceUrl} target="_blank" rel="noreferrer noopener">
                    official page ↗
                  </a>
                </>
              ) : null}
            </span>
          </div>
        ) : null}

        {entry.license ? (
          <div className="workspace-fact">
            <span className="workspace-fact-label">License</span>
            <span>
              {[entry.license.spdx ? `SPDX ${entry.license.spdx}` : null, entry.license.note]
                .filter(Boolean)
                .join(" — ")}
            </span>
          </div>
        ) : null}

        {entry.retrieval ? (
          <div className="workspace-fact">
            <span className="workspace-fact-label">Retrieval</span>
            <code className="inline-code workspace-retrieval">{entry.retrieval}</code>
          </div>
        ) : null}

        {(entry.dependencies ?? []).length > 0 ? (
          <div className="workspace-fact">
            <span className="workspace-fact-label">Target dependencies</span>
            <span>{(entry.dependencies ?? []).map((dep) => dep.name).join(", ")}</span>
          </div>
        ) : null}

        {(entry.implementation ?? []).length > 0 ? (
          <div className="workspace-fact">
            <span className="workspace-fact-label">Vendored files</span>
            <ul className="workspace-files">
              {(entry.implementation ?? []).slice(0, 6).map((file) => (
                <li key={file}>
                  <code className="inline-code">{file}</code>
                </li>
              ))}
              {(entry.implementation ?? []).length > 6 ? (
                <li className="workspace-files-more">
                  +{(entry.implementation ?? []).length - 6} more — see the full record
                </li>
              ) : null}
            </ul>
          </div>
        ) : null}

        {related.length > 0 ? (
          <div className="workspace-fact">
            <span className="workspace-fact-label">Related in this source</span>
            <ul className="workspace-related">
              {related.map((candidate) => (
                <li key={candidate.id}>
                  <a href={`#/preview/${candidate.id}`}>{candidate.name}</a>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
          </div>
        </details>

        <div className="workspace-links">
          <a href={`#/component/${entry.id}`} data-testid="preview-full-record">
            Full record ↗
          </a>
          <a href="#/gallery">Gallery ↗</a>
          {entry.preview?.url ? (
            <a href={entry.preview.url} target="_blank" rel="noreferrer noopener">
              Live off-site ↗
            </a>
          ) : null}
        </div>
      </aside>
    </main>
  );
}
