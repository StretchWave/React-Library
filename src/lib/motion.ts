// Motion preference (M6.4): global gallery preview playback switch, persisted
// in localStorage. Default ON so the visual gallery works out of the box; the
// toolbar toggle (and store federated state) let users stop every mini stage.
const KEY = "rl-motion-play";

type Listener = () => void;

const listeners = new Set<Listener>();
let cached: boolean | null = null;

export function isMotionPlaying(): boolean {
  if (cached === null) {
    try {
      cached = localStorage.getItem(KEY) !== "paused";
    } catch {
      cached = true;
    }
  }
  return cached;
}

export function setMotionPlaying(next: boolean): void {
  cached = next;
  try {
    localStorage.setItem(KEY, next ? "playing" : "paused");
  } catch {
    // Storage unavailable (private mode): in-memory toggle still applies.
  }
  for (const listener of listeners) listener();
}

export function subscribeMotion(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
