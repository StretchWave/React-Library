// Shared status helpers for the browser UI.
import type { CatalogEntry } from "../../catalog/types";

/** Maps an entry status to its status-chip class. */
export function statusChipClass(entry: CatalogEntry): string {
  return `is-${entry.status}`;
}
