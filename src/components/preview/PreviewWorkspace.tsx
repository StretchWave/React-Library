// Preview workspace (M6.2): dedicated full-stage preview for one catalog entry.
// Runnable entries render exclusively through src/catalog/showcases — vendored
// third-party code never executes in the app outside those reviewed wrappers.
// Entries without a runnable preview show an honest kind card with the official
// link and the agent retrieval path. All styling uses --rl-* tokens only.
import { useMemo, useState } from "react";
import {
  aestheticById,
  attributeById,
  categoryById,
  entries,
  sourceById,
} from "../../catalog/client";
import { entryTypeOf, type CatalogEntry } from "../../catalog/types";
import {
  getShowcase,
  type Showcase,
  type ShowcaseControl,
  type ShowcaseValues,
} from "../../catalog/showcases";
import { statusChipClass } from "../browser/statusChip";

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

  const showcase = getShowcase(entry.id);
  return <WorkspaceShell key={entry.id} entry={entry} showcase={showcase} selected={selected} onToggleSelection={onToggleSelection} />;
}

interface WorkspaceShellProps {
  entry: CatalogEntry;
  showcase: Showcase | undefined;
  selected?: boolean;
  onToggleSelection?: (id: string, next: boolean) => void;
}

/** Keyed by entry id so stage state resets when the deep link changes. */
function WorkspaceShell({ entry, showcase, selected, onToggleSelection }: WorkspaceShellProps) {
  const [viewport, setViewport] = useState<Viewport>("full");
  const [stageMode, setStageMode] = useState<StageMode>(showcase?.stage ?? "neutral");
  const [replayKey, setReplayKey] = useState(0);
  const [values, setValues] = useState<ShowcaseValues>(() => {
    const initial: ShowcaseValues = {};
    for (const control of showcase?.controls ?? []) initial[control.id] = control.default;
    return initial;
  });

  const related = useMemo(() => {
    if (!entry.source) return [];
    return entries
      .filter((candidate) => candidate.id !== entry.id && candidate.source === entry.source)
      .sort(
        (a, b) =>
          Number(b.category === entry.category) - Number(a.category === entry.category) ||
          a.id.localeCompare(b.id),
      )
      .slice(0, 6);
  }, [entry]);

  const runnable = Boolean(showcase);
  const kind = previewKindOf(entry, showcase);
  const categoryLabel = categoryById(entry.category)?.label ?? entry.category;
  const viewportWidth = VIEWPORTS.find((candidate) => candidate.id === viewport)?.width ?? null;

  function resetControls(): void {
    const initial: ShowcaseValues = {};
    for (const control of showcase?.controls ?? []) initial[control.id] = control.default;
    setValues(initial);
  }

  function setControl(id: string, value: string | number | boolean): void {
    setValues((prev) => ({ ...prev, [id]: value }));
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

  return (
    <main className="workspace-shell" data-testid="preview-workspace" aria-label={`Preview workspace for ${entry.name}`}>
      <section className="workspace-main" aria-label="Live preview stage">
        {runnable && showcase ? (
          <>
            <div className="workspace-toolbar">
              <label className="workspace-toolbar-field">
                Stage
                <select
                  data-testid="preview-stage-mode"
                  aria-label="Stage background mode"
                  value={stageMode}
                  onChange={(event) => setStageMode(event.target.value as StageMode)}
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
                onClick={() => setReplayKey((current) => current + 1)}
              >
                Replay
              </button>
            </div>
            <div className="workspace-stage-wrap" data-stage={stageMode} data-testid="preview-stage-wrap">
              <div
                className="workspace-stage-frame"
                key={replayKey}
                data-viewport={viewport}
                data-testid="preview-stage"
                style={viewportWidth ? { maxWidth: viewportWidth } : undefined}
              >
                <showcase.Component {...values} />
              </div>
            </div>
            <p className="workspace-hint">
              {showcase.hint ?? "Press Replay to restart the animation."}
            </p>
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
          </>
        ) : (
          <div className="workspace-honest" data-testid="preview-honest">
            <h2>{entry.name}</h2>
            <p className="workspace-honest-kind">
              Preview kind: <strong>{kind}</strong>
              {entry.runtime ? ` · runtime: ${entry.runtime}` : ""}
              {entry.heavy ? " · heavy" : ""}
            </p>
            <p className="workspace-honest-reason">{honestReason(entry)}</p>
            <div className="workspace-honest-actions">
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

        {entry.summary ? <p className="workspace-summary">{entry.summary}</p> : null}

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
