// Entry inspector. Opens as a focused side panel over the current browse view
// without changing the route or scroll position. Contains the preview, the full
// canonical classification, preview-profile facts, provenance, local tags/notes
// and the retrieval actions an agent needs.
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { CatalogEntry } from "../../catalog/types";
import {
  aestheticById,
  attributeById,
  categoryById,
  componentTypeById,
  sourceById,
  techniqueById,
  triggerById,
} from "../../catalog/client";
import {
  previewCostLabel,
  previewModeLabel,
  previewStatusLabel,
  profileOf,
  requirementLabel,
  snapshotUrl,
} from "../../catalog/preview";
import { copyText } from "../../lib/clipboard";
import type { Collection, EntryAnnotation } from "../../lib/personal";
import { PreviewBox } from "../gallery/PreviewBox";
import { statusChipClass } from "../browser/statusChip";

export interface InspectorPanelProps {
  entry: CatalogEntry;
  selected: boolean;
  favorite: boolean;
  annotation: EntryAnnotation;
  collections: Collection[];
  onClose: () => void;
  onToggleSelect: (id: string, next: boolean) => void;
  onToggleFavorite: (id: string) => void;
  onExpand: (id: string) => void;
  onAddToCollection: (collectionId: string, ids: string[]) => void;
  onAddManualTag: (id: string, tag: string) => void;
  onRemoveManualTag: (id: string, tag: string) => void;
  onNoteChange: (id: string, note: string) => void;
  onConfirmTags: (id: string) => void;
}

function label(id: string, kind: "type" | "trigger" | "technique" | "vibe" | "tech"): string {
  if (kind === "type") return componentTypeById(id)?.label ?? id;
  if (kind === "trigger") return triggerById(id)?.label ?? id;
  if (kind === "technique") return techniqueById(id)?.label ?? id;
  if (kind === "vibe") return aestheticById(id)?.label ?? id;
  return attributeById(id)?.label ?? id;
}

function sourceLink(entry: CatalogEntry): string {
  return (
    entry.sourceUrl ??
    entry.preview?.url ??
    (entry.source ? sourceById(entry.source)?.url : undefined) ??
    entry.links?.source ??
    ""
  );
}

function retrievalText(entry: CatalogEntry): string {
  return entry.retrieval ?? `npm run lookup -- ${entry.id} --json`;
}

export function InspectorPanel({
  entry,
  selected,
  favorite,
  annotation,
  collections,
  onClose,
  onToggleSelect,
  onToggleFavorite,
  onExpand,
  onAddToCollection,
  onAddManualTag,
  onRemoveManualTag,
  onNoteChange,
  onConfirmTags,
}: InspectorPanelProps) {
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const [tagDraft, setTagDraft] = useState("");
  const [collectionId, setCollectionId] = useState(collections[0]?.id ?? "");
  const [copyState, setCopyState] = useState("");
  const profile = profileOf(entry);
  const source = entry.source ? sourceById(entry.source) : undefined;
  const category = categoryById(entry.category);
  const sourceUrl = sourceLink(entry);

  useEffect(() => {
    previousFocus.current = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus.current?.focus?.();
    };
  }, [onClose]);

  const copy = async (text: string, labelText: string) => {
    const ok = await copyText(text);
    setCopyState(ok ? `${labelText} copied` : `Could not copy ${labelText.toLowerCase()}`);
    window.setTimeout(() => setCopyState(""), 2200);
  };

  return createPortal(
    <div className="inspector-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <aside
        className="inspector-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="inspector-title"
      >
        <div className="inspector-head">
          <div>
            <p className="inspector-kicker">
              {source?.name ?? "React Library"} {source ? `\u00b7 ${source.status}` : ""}
            </p>
            <h2 id="inspector-title">{entry.name}</h2>
            <div className="inspector-status-row">
              <span className={`status-chip ${statusChipClass(entry)}`}>{entry.status}</span>
              <span className="type-chip">{entry.entryType ?? "local"}</span>
              <span className="type-chip">{previewStatusLabel(entry)}</span>
            </div>
          </div>
          <button ref={closeRef} type="button" className="inspector-close" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="inspector-scroll">
          <div className="inspector-preview">
            <PreviewBox entry={entry} />
            <div className="inspector-preview-actions">
              <button type="button" className="inspector-primary" onClick={() => onExpand(entry.id)}>
                Open full preview
              </button>
              <button
                type="button"
                className="inspector-secondary"
                aria-pressed={favorite}
                onClick={() => onToggleFavorite(entry.id)}
              >
                {favorite ? "Favorite" : "Add favorite"}
              </button>
              <label className="inspector-select">
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={(event) => onToggleSelect(entry.id, event.target.checked)}
                />
                In prompt
              </label>
            </div>
          </div>

          <p className="inspector-summary">{entry.summary}</p>
          {entry.description && entry.description !== entry.summary ? (
            <p className="inspector-description">{entry.description}</p>
          ) : null}

          <section className="inspector-section" aria-labelledby="inspector-classification">
            <h3 id="inspector-classification">Classification</h3>
            <dl className="inspector-dl">
              <div>
                <dt>Category</dt>
                <dd>{category?.label ?? entry.category}</dd>
              </div>
              <div>
                <dt>Source</dt>
                <dd>{source?.name ?? "Built-in"}</dd>
              </div>
              <div>
                <dt>Tech traits</dt>
                <dd>{(entry.attributes ?? []).length ? (entry.attributes ?? []).map((id) => label(id, "tech")).join(", ") : "None recorded"}</dd>
              </div>
            </dl>
            <div className="inspector-class-groups">
              {[
                ["types", entry.types, "type"],
                ["triggers", entry.triggers, "trigger"],
                ["techniques", entry.techniques, "technique"],
                ["vibes", entry.aesthetics ?? [], "vibe"],
              ].map(([group, values, kind]) => (
                <div key={group as string} className="inspector-class-group">
                  <span className="inspector-class-label">{group as string}</span>
                  <div className="inspector-chip-list">
                    {(values as string[]).length === 0 ? (
                      <span className="inspector-muted">None recorded</span>
                    ) : (
                      (values as string[]).map((value) => (
                        <span key={value} className="inspector-chip">
                          {label(value, kind as "type" | "trigger" | "technique" | "vibe")}
                        </span>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
            {entry.tagMeta.reviewNeeded && !annotation.confirmed ? (
              <div className="inspector-review">
                <p>These assisted classifications still need a human review. Inferred tags are listed below.</p>
                <button type="button" onClick={() => onConfirmTags(entry.id)}>
                  Confirm classification
                </button>
              </div>
            ) : null}
            <details className="inspector-details">
              <summary>Tag evidence ({entry.tagMeta.sourceProvided.length} source / {entry.tagMeta.inferred.length} inferred)</summary>
              <p className="inspector-muted">Source-provided: {entry.tagMeta.sourceProvided.join(", ") || "none"}</p>
              <p className="inspector-muted">Inferred: {entry.tagMeta.inferred.join(", ") || "none"}</p>
            </details>
          </section>

          <section className="inspector-section" aria-labelledby="inspector-preview-facts">
            <h3 id="inspector-preview-facts">Preview profile</h3>
            <dl className="inspector-dl">
              <div><dt>Mode</dt><dd>{previewModeLabel(entry)}</dd></div>
              <div><dt>Layout</dt><dd>{profile.layout} ({profile.gridColumnSpan} x {profile.gridRowSpan})</dd></div>
              <div><dt>Cost</dt><dd>{previewCostLabel(entry)}</dd></div>
              <div><dt>Status</dt><dd>{previewStatusLabel(entry)}</dd></div>
              <div><dt>Autoplay</dt><dd>{profile.autoplayAllowed ? "Allowed when visible" : "Manual only"}</dd></div>
              <div><dt>Requires</dt><dd>{profile.requires.length ? profile.requires.map(requirementLabel).join(", ") : "Nothing beyond React"}</dd></div>
            </dl>
            {profile.failureReason ? <p className="inspector-warning">{profile.failureReason}</p> : null}
            {snapshotUrl(entry) ? (
              <p className="inspector-muted">Captured fallback: {snapshotUrl(entry)}</p>
            ) : null}
          </section>

          <section className="inspector-section" aria-labelledby="inspector-retrieval">
            <h3 id="inspector-retrieval">Retrieval</h3>
            <div className="inspector-code-actions">
              <button type="button" onClick={() => void copy(sourceUrl || retrievalText(entry), "Source link")}>
                Copy source link
              </button>
              <button type="button" onClick={() => void copy(retrievalText(entry), "Retrieval instructions")}>
                Copy retrieval
              </button>
              {entry.implementation && entry.implementation.length > 0 ? (
                <button type="button" onClick={() => void copy(entry.implementation?.join("\n") ?? "", "Implementation paths")}>
                  Copy implementation paths
                </button>
              ) : null}
            </div>
            <p className="inspector-muted">{retrievalText(entry)}</p>
            {entry.implementation && entry.implementation.length > 0 ? (
              <p className="inspector-muted">Files: {entry.implementation.join(", ")}</p>
            ) : null}
            {entry.links?.source ? <p className="inspector-muted">Local source: {entry.links.source}</p> : null}
            {sourceUrl ? (
              <a className="inspector-link" href={sourceUrl} target="_blank" rel="noreferrer">
                Open official source
              </a>
            ) : null}
            {copyState ? <p className="inspector-copy-status" role="status">{copyState}</p> : null}
          </section>

          <section className="inspector-section" aria-labelledby="inspector-personal">
            <h3 id="inspector-personal">Your tags and notes</h3>
            <div className="inspector-manual-tags">
              {annotation.manualTags.length === 0 ? (
                <span className="inspector-muted">No manual tags yet.</span>
              ) : (
                annotation.manualTags.map((tag) => (
                  <span key={tag} className="inspector-chip inspector-chip--manual">
                    {tag}
                    <button
                      type="button"
                      onClick={() => onRemoveManualTag(entry.id, tag)}
                      aria-label={`Remove manual tag ${tag}`}
                    >
                      x
                    </button>
                  </span>
                ))
              )}
            </div>
            <form
              className="inspector-tag-form"
              onSubmit={(event) => {
                event.preventDefault();
                if (!tagDraft.trim()) return;
                onAddManualTag(entry.id, tagDraft);
                setTagDraft("");
              }}
            >
              <label>
                <span className="visually-hidden">Add a manual tag</span>
                <input
                  type="text"
                  value={tagDraft}
                  onChange={(event) => setTagDraft(event.target.value)}
                  placeholder="Add a tag"
                />
              </label>
              <button type="submit" disabled={!tagDraft.trim()}>
                Add tag
              </button>
            </form>
            <label className="inspector-note">
              <span>Notes for the next agent</span>
              <textarea
                value={annotation.note}
                onChange={(event) => onNoteChange(entry.id, event.target.value)}
                rows={3}
                placeholder="Usage constraints, integration notes, project-specific decisions..."
              />
            </label>
            <div className="inspector-collection">
              <label>
                <span>Add to collection</span>
                <select value={collectionId} onChange={(event) => setCollectionId(event.target.value)}>
                  <option value="">Choose a collection</option>
                  {collections.map((collection) => (
                    <option key={collection.id} value={collection.id}>
                      {collection.name}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                disabled={!collectionId}
                onClick={() => {
                  if (collectionId) onAddToCollection(collectionId, [entry.id]);
                }}
              >
                Add
              </button>
            </div>
            <p className="inspector-muted">Personal tags, notes and collections stay in this browser and are never overwritten by source syncs.</p>
          </section>

          {entry.props.length > 0 ? (
            <details className="inspector-section inspector-details" open>
              <summary>Props ({entry.props.length})</summary>
              <table className="inspector-props">
                <thead>
                  <tr><th>Name</th><th>Type</th><th>Required</th></tr>
                </thead>
                <tbody>
                  {entry.props.map((prop) => (
                    <tr key={prop.name}>
                      <td>{prop.name}</td>
                      <td>{prop.type}</td>
                      <td>{prop.required ? "yes" : "no"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          ) : null}
          {entry.a11yNotes ? (
            <section className="inspector-section">
              <h3>Accessibility</h3>
              <p className="inspector-muted">{entry.a11yNotes}</p>
            </section>
          ) : null}
          <section className="inspector-section">
            <h3>License</h3>
            <p className="inspector-muted">
              {entry.license
                ? [entry.license.spdx, entry.license.note, entry.license.url].filter(Boolean).join(" \u00b7 ")
                : source?.license ?? "No per-entry license recorded."}
            </p>
            {source?.notes ? <p className="inspector-muted">{source.notes}</p> : null}
          </section>
        </div>
      </aside>
    </div>,
    document.body,
  );
}
