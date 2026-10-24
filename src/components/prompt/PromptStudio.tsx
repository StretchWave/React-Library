// Master-prompt studio (M5.5): renders the generated prompt assembled only
// from canonical catalog records and offers the prominent clipboard action.
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
  const prompt = useMemo(
    () => buildMasterPrompt(items.map((entry) => entry.id), items, { generatedAt }),
    [items, generatedAt],
  );
  const warnings = useMemo(
    () =>
      items.flatMap((entry) =>
        availabilityNotes(entry).map((note) => `${entry.name}: ${note}`),
      ),
    [items],
  );
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setCopied(false);
  }, [prompt]);

  async function handleCopy(): Promise<void> {
    setCopied(await copyText(prompt));
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
      ) : (
        <pre className="prompt-text" tabIndex={0} aria-label="Generated master prompt">
          <code>{prompt}</code>
        </pre>
      )}
    </section>
  );
}
