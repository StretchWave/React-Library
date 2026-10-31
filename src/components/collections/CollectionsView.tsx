// Collections view: favorites, recent history and named local collections.
// Everything here is personal data stored in this browser; canonical records
// are joined by id and never duplicated into storage.
import { useMemo, useState } from "react";
import type { CatalogEntry } from "../../catalog/types";
import type { Collection } from "../../lib/personal";
import { profileOf, snapshotUrl } from "../../catalog/preview";

export interface CollectionsViewProps {
  entries: CatalogEntry[];
  collections: Collection[];
  favoriteIds: string[];
  recentIds: string[];
  focusCollectionId?: string;
  onOpenEntry: (id: string) => void;
  onExpandEntry: (id: string) => void;
  onCreateCollection: (name: string) => void;
  onDeleteCollection: (id: string) => void;
  onRemoveFromCollection: (collectionId: string, ids: string[]) => void;
  onToggleFavorite: (id: string) => void;
  onNavigate: (collectionId?: string) => void;
}

function Thumb({ entry }: { entry: CatalogEntry }) {
  const url = snapshotUrl(entry);
  return (
    <span className="collection-thumb" aria-hidden="true">
      {url ? <img src={url} alt="" loading="lazy" /> : <span>{entry.name.slice(0, 1)}</span>}
    </span>
  );
}

function EntryRow({
  entry,
  onOpen,
  onExpand,
  onRemove,
  removeLabel,
}: {
  entry: CatalogEntry;
  onOpen: () => void;
  onExpand: () => void;
  onRemove?: () => void;
  removeLabel?: string;
}) {
  const profile = profileOf(entry);
  return (
    <li className="collection-row">
      <Thumb entry={entry} />
      <button
        type="button"
        className="collection-row-main"
        aria-label={`Open ${entry.name} details`}
        onClick={onOpen}
      >
        <span className="collection-row-name">{entry.name}</span>
        <span className="collection-row-meta">
          {entry.types[0] ?? "component"} {"\u00b7"} {profile.layout} {"\u00b7"} {profile.cost}
        </span>
      </button>
      <div className="collection-row-actions">
        <button type="button" onClick={onExpand}>
          Expand
        </button>
        {onRemove ? (
          <button type="button" onClick={onRemove}>
            {removeLabel ?? "Remove"}
          </button>
        ) : null}
      </div>
    </li>
  );
}

export function CollectionsView({
  entries,
  collections,
  favoriteIds,
  recentIds,
  focusCollectionId,
  onOpenEntry,
  onExpandEntry,
  onCreateCollection,
  onDeleteCollection,
  onRemoveFromCollection,
  onToggleFavorite,
  onNavigate,
}: CollectionsViewProps) {
  const [name, setName] = useState("");
  const byId = useMemo(() => new Map(entries.map((entry) => [entry.id, entry])), [entries]);
  const focused = focusCollectionId ? collections.find((collection) => collection.id === focusCollectionId) : undefined;
  const favorites = favoriteIds.map((id) => byId.get(id)).filter((entry): entry is CatalogEntry => Boolean(entry));
  const recent = recentIds.map((id) => byId.get(id)).filter((entry): entry is CatalogEntry => Boolean(entry));
  const focusedEntries = focused
    ? focused.ids.map((id) => byId.get(id)).filter((entry): entry is CatalogEntry => Boolean(entry))
    : [];

  if (focused) {
    return (
      <section className="collections-view" aria-labelledby="collection-detail-title">
        <button type="button" className="view-back" onClick={() => onNavigate()}>
          Back to collections
        </button>
        <header className="view-heading">
          <div>
            <p className="view-kicker">Named collection</p>
            <h1 id="collection-detail-title">{focused.name}</h1>
            <p>{focusedEntries.length} components, stored locally.</p>
          </div>
          <button
            type="button"
            className="view-danger"
            onClick={() => {
              onDeleteCollection(focused.id);
              onNavigate();
            }}
          >
            Delete collection
          </button>
        </header>
        {focusedEntries.length === 0 ? (
          <p className="view-empty">This collection is empty. Add components from any inspector.</p>
        ) : (
          <ul className="collection-rows">
            {focusedEntries.map((entry) => (
              <EntryRow
                key={entry.id}
                entry={entry}
                onOpen={() => onOpenEntry(entry.id)}
                onExpand={() => onExpandEntry(entry.id)}
                onRemove={() => onRemoveFromCollection(focused.id, [entry.id])}
              />
            ))}
          </ul>
        )}
      </section>
    );
  }

  return (
    <section className="collections-view" aria-labelledby="collections-title">
      <header className="view-heading">
        <div>
          <p className="view-kicker">Local-first workspace</p>
          <h1 id="collections-title">Collections</h1>
          <p>Favorites, named sets and recent history. Nothing leaves this browser.</p>
        </div>
      </header>

      <section className="collection-block" aria-labelledby="favorites-title">
        <div className="collection-block-head">
          <h2 id="favorites-title">Favorites</h2>
          <span>{favorites.length}</span>
        </div>
        {favorites.length === 0 ? (
          <p className="view-empty">Star a component in the gallery to keep it here.</p>
        ) : (
          <ul className="collection-rows">
            {favorites.map((entry) => (
              <EntryRow
                key={entry.id}
                entry={entry}
                onOpen={() => onOpenEntry(entry.id)}
                onExpand={() => onExpandEntry(entry.id)}
                onRemove={() => onToggleFavorite(entry.id)}
                removeLabel="Unfavorite"
              />
            ))}
          </ul>
        )}
      </section>

      <section className="collection-block" aria-labelledby="named-title">
        <div className="collection-block-head">
          <h2 id="named-title">Named collections</h2>
          <span>{collections.length}</span>
        </div>
        <form
          className="collection-create"
          onSubmit={(event) => {
            event.preventDefault();
            if (!name.trim()) return;
            onCreateCollection(name);
            setName("");
          }}
        >
          <label>
            <span className="visually-hidden">New collection name</span>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="New collection name"
              maxLength={60}
            />
          </label>
          <button type="submit" disabled={!name.trim()}>
            Create collection
          </button>
        </form>
        {collections.length === 0 ? (
          <p className="view-empty">Create a collection, then add components from their inspectors.</p>
        ) : (
          <ul className="collection-cards">
            {collections.map((collection) => {
              const items = collection.ids
                .map((id) => byId.get(id))
                .filter((entry): entry is CatalogEntry => Boolean(entry));
              return (
                <li key={collection.id} className="collection-card">
                  <button
                    type="button"
                    className="collection-card-main"
                    aria-label={`Open collection ${collection.name} (${items.length} components)`}
                    onClick={() => onNavigate(collection.id)}
                  >
                    <span className="collection-card-name">{collection.name}</span>
                    <span className="collection-card-count">{items.length} components</span>
                    <span className="collection-card-thumbs">
                      {items.slice(0, 4).map((entry) => (
                        <Thumb key={entry.id} entry={entry} />
                      ))}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="collection-delete"
                    onClick={() => onDeleteCollection(collection.id)}
                    aria-label={`Delete collection ${collection.name}`}
                  >
                    Delete
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="collection-block" aria-labelledby="recent-title">
        <div className="collection-block-head">
          <h2 id="recent-title">Recently viewed</h2>
          <span>{recent.length}</span>
        </div>
        {recent.length === 0 ? (
          <p className="view-empty">Open a component to start your recent history.</p>
        ) : (
          <ul className="collection-rows">
            {recent.map((entry) => (
              <EntryRow
                key={entry.id}
                entry={entry}
                onOpen={() => onOpenEntry(entry.id)}
                onExpand={() => onExpandEntry(entry.id)}
              />
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}
