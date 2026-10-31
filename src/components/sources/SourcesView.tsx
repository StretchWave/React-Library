// Source coverage view. Counts are derived from the canonical catalog and the
// checked-in source coverage records. "Discovered" means tracked by this
// project, not a claim that an external library has been fully enumerated.
import { useMemo } from "react";
import type { CatalogEntry } from "../../catalog/types";
import { sourceGroups, coverageTotals, sourceStatusLabel, type SourceGroup } from "../../lib/sources";
import { previewStatusLabel } from "../../catalog/preview";

export interface SourcesViewProps {
  entries: CatalogEntry[];
  focusSourceId?: string;
  onOpenEntry: (id: string) => void;
  onExpandEntry: (id: string) => void;
  onNavigate: (sourceId?: string) => void;
}

type StatKey = "discovered" | "imported" | "previewReady" | "usable" | "locked" | "blocked" | "reviewNeeded";

const STAT_LABELS: Array<[StatKey, string]> = [
  ["discovered", "Discovered"],
  ["imported", "Imported"],
  ["previewReady", "Preview ready"],
  ["usable", "Usable"],
  ["locked", "Locked"],
  ["blocked", "Blocked"],
  ["reviewNeeded", "Review needed"],
];

function adapterCommand(id: string): string {
  if (id === "shadcn") return "npm run ingest-shadcn -- --write";
  if (id === "magic-ui") return "npm run ingest-magicui -- --write";
  if (id === "react-bits") return "npm run ingest-reactbits -- --write";
  if (id === "codepen") return "npm run ingest-codepen -- --url=<verified-pen-url> --author=<name> --license=<id> --write";
  if (["originkit", "pryzm", "ditther", "getlayers"].includes(id)) {
    return "npm run ingest-reference -- --source=" + id + " --url=<official-item-url> --title=<title> --write";
  }
  return "manual curation / official retrieval only";
}

function SourceDetail({ group, onOpenEntry, onExpandEntry }: {
  group: SourceGroup;
  onOpenEntry: (id: string) => void;
  onExpandEntry: (id: string) => void;
}) {
  return (
    <section className="source-detail" aria-labelledby="source-detail-title">
      <header className="source-detail-head">
        <div>
          <p className="view-kicker">Source coverage</p>
          <h1 id="source-detail-title">{group.name}</h1>
          <p className="source-status-line">
            <span className={`source-status source-status--${group.status}`}>{sourceStatusLabel(group.status)}</span>
            {" "}via {group.accessMethod}
          </p>
        </div>
        {group.url ? (
          <a className="source-open" href={group.url} target="_blank" rel="noreferrer">
            Open official source
          </a>
        ) : null}
      </header>
      <div className="source-facts">
        <div><span>License</span><strong>{group.license}</strong></div>
        <div><span>Auth</span><strong>{group.auth ?? "None recorded"}</strong></div>
        <div><span>Limit</span><strong>{group.limit ?? "None recorded"}</strong></div>
        <div><span>Checked</span><strong>{group.stats.checkedAt ?? "Not recorded"}</strong></div>
      </div>
      <p className="source-notes">{group.notes}</p>
      <div className="source-stat-grid">
        {STAT_LABELS.map(([key, label]) => (
          <div key={key} className={`source-stat source-stat--${key}`}>
            <strong>{group.stats[key]}</strong>
            <span>{label}</span>
          </div>
        ))}
      </div>
      {group.stats.note ? <p className="source-note">{group.stats.note}</p> : null}
      {group.stats.blockedRecords.length > 0 ? (
        <section className="source-blockers" aria-labelledby="source-blockers-title">
          <h2 id="source-blockers-title">Blocked or waiting on access</h2>
          <ul>
            {group.stats.blockedRecords.map((blocked) => (
              <li key={`${blocked.label}-${blocked.reason}`}>
                <strong>{blocked.label}</strong>
                <p>{blocked.reason}</p>
                {blocked.url ? <a href={blocked.url} target="_blank" rel="noreferrer">Reference</a> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <section className="source-entries" aria-labelledby="source-entries-title">
        <h2 id="source-entries-title">Tracked entries ({group.entries.length})</h2>
        {group.entries.length === 0 ? (
          <p className="view-empty">No verified entries have been imported from this source yet.</p>
        ) : (
          <ul className="source-entry-list">
            {group.entries.map((entry) => (
              <li key={entry.id}>
                <button type="button" onClick={() => onOpenEntry(entry.id)}>
                  <span>{entry.name}</span>
                  <span>{entry.types[0] ?? entry.category}</span>
                  <span>{previewStatusLabel(entry)}</span>
                </button>
                <button type="button" onClick={() => onExpandEntry(entry.id)}>
                  Expand
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
      <p className="source-command"><span>Adapter / retrieval</span><code>{adapterCommand(group.id)}</code></p>
    </section>
  );
}

export function SourcesView({ entries, focusSourceId, onOpenEntry, onExpandEntry, onNavigate }: SourcesViewProps) {
  const groups = useMemo(() => sourceGroups(entries), [entries]);
  const totals = useMemo(() => coverageTotals(groups), [groups]);
  const focused = focusSourceId ? groups.find((group) => group.id === focusSourceId) : undefined;

  if (focusSourceId) {
    if (!focused) {
      return (
        <section className="sources-view">
          <button type="button" className="view-back" onClick={() => onNavigate()}>Back to sources</button>
          <p className="view-empty">Unknown source "{focusSourceId}".</p>
        </section>
      );
    }
    return (
      <section className="sources-view">
        <button type="button" className="view-back" onClick={() => onNavigate()}>Back to sources</button>
        <SourceDetail group={focused} onOpenEntry={onOpenEntry} onExpandEntry={onExpandEntry} />
      </section>
    );
  }

  return (
    <section className="sources-view" aria-labelledby="sources-title">
      <header className="view-heading">
        <div>
          <p className="view-kicker">Coverage, not aspiration</p>
          <h1 id="sources-title">Sources</h1>
          <p>What is tracked, what is usable, and what access is blocked. Imported and preview-ready counts derive from the catalog; totals include built-in entries, and review-needed sums source records plus entries.</p>
        </div>
      </header>
      <div className="source-totals" aria-label="Overall source coverage">
        {STAT_LABELS.map(([key, label]) => (
          <div key={key}>
            <strong>{totals[key]}</strong>
            <span>{label}</span>
          </div>
        ))}
      </div>
      <ul className="source-cards">
        {groups.map((group) => (
          <li key={group.id} className={`source-card source-card--${group.status}`}>
            <div className="source-card-head">
              <div>
                <h2>{group.name}</h2>
                <span className={`source-status source-status--${group.status}`}>{sourceStatusLabel(group.status)}</span>
              </div>
              <button type="button" onClick={() => onNavigate(group.id)}>
                Inspect
              </button>
            </div>
            <p className="source-card-license">{group.license}</p>
            <dl className="source-card-stats">
              <div><dt>Discovered</dt><dd>{group.stats.discovered}</dd></div>
              <div><dt>Imported</dt><dd>{group.stats.imported}</dd></div>
              <div><dt>Preview ready</dt><dd>{group.stats.previewReady}</dd></div>
              <div><dt>Usable</dt><dd>{group.stats.usable}</dd></div>
              <div><dt>Locked</dt><dd>{group.stats.locked}</dd></div>
              <div><dt>Blocked</dt><dd>{group.stats.blocked}</dd></div>
              <div><dt>Review</dt><dd>{group.stats.reviewNeeded}</dd></div>
            </dl>
            {group.stats.blockedRecords.length > 0 ? (
              <p className="source-card-block">
                {group.stats.blockedRecords[0].label}: {group.stats.blockedRecords[0].reason}
                {group.stats.blockedRecords.length > 1 ? ` (+${group.stats.blockedRecords.length - 1} more)` : ""}
              </p>
            ) : group.stats.note ? (
              <p className="source-card-note">{group.stats.note}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
