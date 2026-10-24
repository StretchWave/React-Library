// Full record display (M2; extended M5.3 with v2 provenance): status chip,
// metadata, themes, props table, links, plus source/library, license,
// retrieval, dependencies and local-path data — all from the catalog record.
import type { CatalogEntry } from "../../catalog/types";
import { aestheticById, attributeById, categoryById, sourceById } from "../../catalog/client";
import { entryTypeOf, type EntryLinks } from "../../catalog/types";
import { statusChipClass } from "./statusChip";

function LinkLine({ label, path }: { label: string; path: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>
        <code className="inline-code">{path}</code>
      </dd>
    </div>
  );
}

function LinksBlock({ links }: { links: EntryLinks }) {
  if (links.source === undefined && links.demo === undefined && links.docs === undefined) {
    return (
      <dl className="detail-links">
        <div>
          <dt>Links</dt>
          <dd>—</dd>
        </div>
      </dl>
    );
  }
  return (
    <dl className="detail-links" aria-label="File links">
      {links.source ? <LinkLine label="Source" path={links.source} /> : null}
      {links.demo ? <LinkLine label="Demo" path={links.demo} /> : null}
      {links.docs ? <LinkLine label="Docs" path={links.docs} /> : null}
    </dl>
  );
}

export interface DetailPaneProps {
  entry: CatalogEntry | null;
}

export function DetailPane({ entry }: DetailPaneProps) {
  if (!entry) {
    return (
      <div className="detail-empty">
        <p>Select a component from the catalog to inspect it.</p>
      </div>
    );
  }

  const categoryLabel = categoryById(entry.category)?.label ?? entry.category;

  return (
    <article className="detail-card" aria-labelledby="detail-title">
      <h2 className="detail-title" id="detail-title">
        {entry.name}
      </h2>
      <span className={`status-chip ${statusChipClass(entry)}`}>{entry.status}</span>
      <p className="detail-summary">{entry.summary}</p>
      {entry.description ? <p className="detail-description">{entry.description}</p> : null}

      <div className="detail-meta">
        <span>v{entry.version}</span>
        <span>added {entry.addedDate}</span>
        <span>category: {categoryLabel}</span>
      </div>

      <div className="chip-row" data-testid="theme-chips" aria-label="Supported themes">
        {entry.themes.map((themeId) => (
          <span key={themeId} className="neutral-chip">
            {themeId}
          </span>
        ))}
      </div>

      {entry.tags.length > 0 ? (
        <div className="chip-row" data-testid="tag-chips" aria-label="Tags">
          {entry.tags.map((tag) => (
            <span key={tag} className="neutral-chip">
              #{tag}
            </span>
          ))}
        </div>
      ) : null}

      {entry.aliases.length > 0 ? (
        <div className="chip-row" data-testid="alias-chips" aria-label="Aliases">
          {entry.aliases.map((alias) => (
            <span key={alias} className="neutral-chip">
              alias: {alias}
            </span>
          ))}
        </div>
      ) : null}

      {(entry.aesthetics ?? []).length > 0 ? (
        <div className="chip-row" data-testid="aesthetic-chips" aria-label="Visual aesthetics">
          {(entry.aesthetics ?? []).map((id) => (
            <span key={id} className="aesthetic-chip">
              {aestheticById(id)?.label ?? id}
            </span>
          ))}
        </div>
      ) : null}

      {(entry.attributes ?? []).length > 0 ? (
        <div className="chip-row" data-testid="attribute-chips" aria-label="Technical attributes">
          {(entry.attributes ?? []).map((id) => (
            <span key={id} className="neutral-chip">
              {attributeById(id)?.label ?? id}
            </span>
          ))}
        </div>
      ) : null}

      {entry.props.length > 0 ? (
        <table className="props-table">
          <caption>Props</caption>
          <thead>
            <tr>
              <th scope="col">Prop</th>
              <th scope="col">Type</th>
              <th scope="col">Required</th>
              <th scope="col">Default</th>
              <th scope="col">Description</th>
            </tr>
          </thead>
          <tbody>
            {entry.props.map((prop) => (
              <tr key={prop.name}>
                <th scope="row">{prop.name}</th>
                <td>
                  <code className="inline-code">{prop.type}</code>
                </td>
                <td>{prop.required ? "yes" : "no"}</td>
                <td>{prop.default ?? "—"}</td>
                <td>{prop.description ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}

      <LinksBlock links={entry.links ?? {}} />

      {/* --- v2 provenance (M5.3) ---------------------------------------- */}
      <div className="detail-notes">
        <span className="field-label">Catalog type: </span>
        {entryTypeOf(entry) === "external"
          ? "external reference — implementation is not stored in this repository"
          : "local — implementation available in-repo"}
      </div>

      {entry.source ? (
        <div className="detail-notes">
          <span className="field-label">Source library: </span>
          {sourceById(entry.source)?.name ?? entry.source}
          {entry.sourceUrl ? (
            <>
              {" — "}
              <a href={entry.sourceUrl} target="_blank" rel="noreferrer noopener">
                {entry.sourceUrl}
              </a>
            </>
          ) : null}
        </div>
      ) : null}

      {entry.license ? (
        <div className="detail-notes">
          <span className="field-label">License: </span>
          {[entry.license.spdx ? `SPDX ${entry.license.spdx}` : null, entry.license.note]
            .filter(Boolean)
            .join(" — ")}
        </div>
      ) : null}

      {entry.retrieval ? (
        <div className="detail-notes">
          <span className="field-label">Retrieval: </span>
          <code className="inline-code detail-retrieval">{entry.retrieval}</code>
        </div>
      ) : null}

      {(entry.dependencies ?? []).length > 0 ? (
        <div className="detail-notes">
          <span className="field-label">Runtime dependencies (target project): </span>
          {(entry.dependencies ?? [])
            .map((dep) => `${dep.name}${dep.reason ? ` (${dep.reason})` : ""}`)
            .join(", ")}
        </div>
      ) : null}

      {entry.manifest ? (
        <div className="detail-notes">
          <span className="field-label">Manifest: </span>
          <code className="inline-code">{entry.manifest}</code>
        </div>
      ) : null}

      {entry.localDir ? (
        <div className="detail-notes">
          <span className="field-label">Local directory: </span>
          <code className="inline-code">{entry.localDir}</code>
        </div>
      ) : null}

      {(entry.implementation ?? []).length > 0 ? (
        <dl className="detail-links" aria-label="Implementation files">
          <div>
            <dt>Implementation files</dt>
          </div>
          {(entry.implementation ?? []).map((file) => (
            <div key={file}>
              <dt aria-hidden="true" />
              <dd>
                <code className="inline-code">{file}</code>
              </dd>
            </div>
          ))}
        </dl>
      ) : null}

      {entry.preview && entry.preview.url && entry.preview.type !== "static" ? (
        <div className="detail-notes">
          <span className="field-label">Preview: </span>
          <a href={entry.preview.url} target="_blank" rel="noreferrer noopener">
            Open external preview ↗
          </a>
        </div>
      ) : null}

      {entry.externalDependencies.length > 0 ? (
        <div className="detail-notes">
          <span className="field-label">External dependencies: </span>
          {entry.externalDependencies.join(", ")}
        </div>
      ) : null}

      {entry.a11yNotes ? (
        <div className="detail-notes">
          <span className="field-label">Accessibility: </span>
          {entry.a11yNotes}
        </div>
      ) : null}
    </article>
  );
}
