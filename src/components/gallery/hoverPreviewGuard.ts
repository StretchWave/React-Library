// A panel covering a neighboring card can be dismissed while the pointer is
// already over that card. Without a short guard, unmounting the panel exposes
// the card and its mouseenter immediately opens another preview. Explicit
// dismissals suppress new opens briefly; ordinary mouseleave does not.
let suppressedUntil = 0;
const DISMISS_GUARD_MS = 320;

export function suppressHoverPreview(ms = DISMISS_GUARD_MS): void {
  suppressedUntil = Date.now() + ms;
}

export function isHoverPreviewSuppressed(): boolean {
  return Date.now() < suppressedUntil;
}
