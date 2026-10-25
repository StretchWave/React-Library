// Master-prompt studio (M5.5; M7.5 polish): renders the generated prompt
// assembled only from canonical catalog records, records an optional target
// project, and offers the prominent clipboard action. The generated text stays
// derived from the deterministic builder; editors can tweak the copy without
// ever losing the canonical selection data (restore is one click away).
import { useEffect, useMemo, useState } from "react";
import { buildMasterPrompt } from "../../lib/prompt";
import type { CatalogEntry } from "../../catalog/types";
import { copyText } from "../../lib/clipboard";
import { availabilityNotes } from "../gallery/SelectionTray";

export interface PromptStudioProps {
  items: CatalogEntry[];
  generatedAt?: string;
  onBack: () => void;
}

export function PromptStudio({ items, generatedAt, onBack }: PromptStudioProps) {
  const [targetProject, setTargetProject] = useState("");
  const prompt = useMemo(
    () =>
      buildMasterPrompt(items.map((entry) => entry.id), items, {
        generatedAt,
        targetProject: targetProject.trim() || undefined,
      }),
    [items, generatedAt, targetProject],
  );
  const warnings = useMemo(
    () =>
      items.flatMap((entry) =>
        availabilityNotes(entry).map((note) => `${entry.name}: ${note}`),
      ),
    [items],
  );
  const [copied, setCopied] = useState(false);
  // null = the deterministic generated prompt; string = user-edited copy.
  // Editing never feeds back into the selection state — restoring regenerates
  // from the canonical records.
  const [edited, setEdited] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    setCopied(false);
    // A selection change regenerates the prompt; a stale edit would silently
    // drift from the canonical records, so it resets (visible, not silent).
    setEdited(null);
  }, [prompt]);

  const shown = edited ?? prompt;

  async function handleCopy(): Promise<void> {
    setCopied(await copyText(shown));
  }

  return (
    <section className="prompt-studio" aria-label="Master prompt studio">
      <div className="prompt-head">
        <h2 className="prompt-title">Master prompt studio</h2>
        <div className="prompt-head-actions">
          <button type="button" className="tray-clear" onClick={onBack}>
            Back to selection
          </button>
          <button
            type="button"
            className="tray-generate studio-copy"
            aria-label="Copy master prompt to clipboard"
            onClick={handleCopy}
            disabled={items.length === 0}
          >
            {copied ? "Copied ✓" : "Copy master prompt"}
          </button>
        </div>
      </div>

      <p className="result-count" role="status">
        {items.length === 0
          ? "Master prompt — 0 components selected"
          : `Master prompt — ${items.length} component${items.length === 1 ? "" : "s"} (order preserved)`}
      </p>

      <div className="prompt-settings">
        <label className="prompt-settings-label" htmlFor="prompt-target-project">
          Target project (optional)
        </label>
        <input
          id="prompt-target-project"
          className="filter-input prompt-target-input"
          type="text"
          placeholder="Where this prompt is applied, e.g. onboarding revamp"
          value={targetProject}
          onChange={(event) => setTargetProject(event.target.value)}
        />
      </div>

      {warnings.length > 0 ? (
        <ul className="prompt-warnings" aria-label="Selection readiness notes">
          {warnings.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      ) : null}

      {items.length === 0 ? (
        <p className="prompt-empty-state">
          Nothing selected yet. Open the selection tray, tick components, and return — the
          studio reflects the live selection.
        </p>
      ) : editing ? (
        <>
          <div className="prompt-edit-actions">
            <p className="result-count">
              Editing a copy — the selection data stays untouched. Restore regenerates from
              the canonical records.
            </p>
            <button type="button" className="tray-clear" onClick={() => {
              setEdited(null);
              setEditing(false);
            }}>
              Discard edits &amp; restore generated
            </button>
          </div>
          <textarea
            className="prompt-text prompt-text-edit"
            value={shown}
            onChange={(event) => setEdited(event.target.value)}
            aria-label="Editable master prompt"
            spellCheck={false}
          />
        </>
      ) : (
        <>
          <div className="prompt-edit-actions">
            <p className="result-count">
              {edited ? "Showing an edited copy — restore regenerates from the records." : "Generated deterministically from the selected catalog records."}
            </p>
            <button type="button" className="tray-clear" onClick={() => setEditing(true)}>
              Edit prompt
            </button>
          </div>
          <pre className="prompt-text" tabIndex={0} aria-label="Generated master prompt">
            <code>{shown}</code>
          </pre>
        </>
      )}
    </section>
  );
}
