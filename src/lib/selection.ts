// Selection store (M5.4, MASTER_SPEC §7). Selections are lists of stable entry
// ids (never names, never positions). Order is user-controlled (append order +
// up/down reordering); persistence prunes ids that no longer exist so a stale
// localStorage payload cannot resurrect removed entries.
export const SELECTION_STORAGE_KEY = "rl.selection.v1";

/** Toggles an id in/out of the selection, preserving resolved order. */
export function toggleId(selected: string[], id: string): string[] {
  if (selected.includes(id)) {
    return selected.filter((candidate) => candidate !== id);
  }
  return [...selected, id];
}

/** Moves one id up (-1) or down (+1) inside the selection order. */
export function moveById(selected: string[], id: string, delta: -1 | 1): string[] {
  const from = selected.indexOf(id);
  if (from === -1) return selected;
  const to = from + delta;
  if (to < 0 || to >= selected.length) return selected;
  const next = [...selected];
  next[from] = next[to]!;
  next[to] = id;
  return next;
}

/** Adds ids that are not already selected, keeping the given order. */
export function addIds(selected: string[], ids: string[]): string[] {
  const existing = new Set(selected);
  const additions = ids.filter((id) => !existing.has(id));
  return additions.length === 0 ? selected : [...selected, ...additions];
}

/** Parses + prunes a persisted selection against the current catalog. */
export function parseSelection(raw: string | null, validIds: ReadonlySet<string>): string[] {
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const candidate of parsed) {
    if (typeof candidate !== "string" || !validIds.has(candidate) || seen.has(candidate)) {
      continue; // stale/unknown/duplicate id from a previous catalog state
    }
    seen.add(candidate);
    result.push(candidate);
  }
  return result;
}

export function serializeSelection(selected: string[]): string {
  return JSON.stringify(selected);
}

export function saveSelection(selected: string[]): void {
  try {
    localStorage.setItem(SELECTION_STORAGE_KEY, serializeSelection(selected));
  } catch {
    // Storage unavailable (private mode, quota) — selection stays in memory.
  }
}

export function loadSelection(validIds: ReadonlySet<string>): string[] {
  try {
    return parseSelection(localStorage.getItem(SELECTION_STORAGE_KEY), validIds);
  } catch {
    return [];
  }
}
