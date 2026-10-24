// App shell (M1). Renders the canonical catalog as-is:
// header with counts, entry list, detail pane with empty-state placeholder.
// M2 adds search/filters + full detail metadata; M3 adds theming + previews.
import { useState } from "react";
import { catalogCounts, entries, findEntry } from "./catalog/client";

export default function App() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = selectedId ? (findEntry(selectedId) ?? null) : null;

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-heading">
          <h1 className="app-title">React Library</h1>
          <p className="app-tagline">
            Agent-first component catalog — {catalogCounts.entries} components,{" "}
            {catalogCounts.themes} themes
          </p>
        </div>
      </header>
      <main className="app-main">
        <nav className="entry-nav" aria-label="Component catalog">
          <ul className="entry-list">
            {entries.map((entry) => (
              <li key={entry.id}>
                <button
                  type="button"
                  className={
                    selectedId === entry.id ? "entry-item is-selected" : "entry-item"
                  }
                  aria-current={selectedId === entry.id ? "true" : undefined}
                  onClick={() => setSelectedId(entry.id)}
                >
                  <span className="entry-label">{entry.name}</span>
                  {" "}
                  <span className="entry-status">{entry.status}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>
        <section className="detail-pane" aria-label="Component details">
          {selected ? (
            <article className="detail-card">
              <h2 className="detail-title">{selected.name}</h2>
              <p className="detail-summary">{selected.summary}</p>
            </article>
          ) : (
            <div className="detail-empty">
              <p>Select a component from the catalog to inspect it.</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
