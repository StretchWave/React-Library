// Preview-profile helpers (schema v3). The catalog owns layout/cost/status;
// these functions only translate that data into honest UI decisions. No
// component is treated as live merely because it has a source file.
import type { CSSProperties } from "react";
import { entryTypeOf, type CatalogEntry, type PreviewProfile, type PreviewRequirement } from "./types";

export interface PreviewDecisionOptions {
  globalPaused?: boolean;
  reducedMotion?: boolean;
  /** Set false for off-screen cards; expensive/live previews must unload. */
  visible?: boolean;
  /** A deliberate one-at-a-time hover preview may run a low/medium-cost entry
   *  even when the gallery itself does not autoplay it. Pause, reduced motion,
   *  visibility, cost and heavy gates still apply. */
  forceLive?: boolean;
}

export function profileOf(entry: CatalogEntry): PreviewProfile {
  if (entry.previewProfile) return entry.previewProfile;
  // Records without a preview profile still inherit an honest baseline from
  // their availability: external references never become fake snapshots.
  const external = entryTypeOf(entry) === "external" || entry.preview?.type === "external";
  return {
    mode: external ? "external" : entry.preview?.type === "none" ? "unavailable" : "snapshot",
    layout: "standard",
    cost: entry.heavy ? "high" : "low",
    aspectRatio: "4 / 3",
    minWidth: 240,
    minHeight: 220,
    gridColumnSpan: 1,
    gridRowSpan: 1,
    expandedRecommended: Boolean(entry.heavy),
    requires: entry.heavy ? ["gpu"] : [],
    autoplayAllowed: false,
    previewStatus: external ? "external" : entry.preview?.type === "none" ? "unavailable" : "ready",
    failureReason: entry.preview?.note,
  };
}

/** Converts a repo-relative public path to the Vite public URL. */
export function snapshotUrl(entry: CatalogEntry): string | undefined {
  const value = profileOf(entry).snapshotPath;
  if (!value) return undefined;
  if (/^https?:\/\//i.test(value)) return value;
  return value.replace(/\\/g, "/").replace(/^public\//, "/");
}

export function loopUrl(entry: CatalogEntry): string | undefined {
  const value = profileOf(entry).loopPath;
  if (!value) return undefined;
  if (/^https?:\/\//i.test(value)) return value;
  return value.replace(/\\/g, "/").replace(/^public\//, "/");
}

export function canShowLive(entry: CatalogEntry, options: PreviewDecisionOptions = {}): boolean {
  const profile = profileOf(entry);
  if (options.globalPaused || options.reducedMotion) return false;
  if (options.visible === false) return false;
  if (profile.mode !== "live" || profile.previewStatus !== "ready") return false;
  if (profile.cost === "high" || entry.heavy) return false;
  return options.forceLive ? true : profile.autoplayAllowed;
}

/** Cards use a real screenshot for expensive/external/unavailable previews. */
export function preferredPreviewKind(
  entry: CatalogEntry,
  options: PreviewDecisionOptions = {},
): "live" | "snapshot" | "external" | "unavailable" {
  const profile = profileOf(entry);
  if (profile.mode === "external") return "external";
  if (profile.mode === "unavailable" || profile.previewStatus === "unavailable") return "unavailable";
  if (canShowLive(entry, options) && !(options.reducedMotion || options.globalPaused)) return "live";
  return snapshotUrl(entry) ? "snapshot" : "unavailable";
}

export function previewStatusLabel(entry: CatalogEntry): string {
  const profile = profileOf(entry);
  if (profile.previewStatus === "external") return "External reference";
  if (profile.previewStatus === "unavailable") return "No local preview";
  if (profile.previewStatus === "error") return "Preview error";
  if (profile.cost === "high") return "Live workspace";
  if (profile.mode === "snapshot") return "Snapshot";
  if (profile.mode === "loop") return "Loop";
  return "Live";
}

export function previewModeLabel(entry: CatalogEntry): string {
  const profile = profileOf(entry);
  return {
    live: "Live preview",
    snapshot: "Captured snapshot",
    loop: "Captured loop",
    external: "External reference",
    unavailable: "Unavailable",
  }[profile.mode];
}

export function previewCostLabel(entry: CatalogEntry): string {
  const profile = profileOf(entry);
  return `${profile.cost[0].toUpperCase()}${profile.cost.slice(1)} cost`;
}

export function requirementLabel(requirement: PreviewRequirement): string {
  return {
    webgl: "WebGL",
    "canvas-2d": "Canvas 2D",
    pointer: "Pointer",
    keyboard: "Keyboard",
    scroll: "Scroll",
    gpu: "GPU",
    "user-input": "User input",
    "reduced-motion": "Reduced motion",
  }[requirement];
}

export function previewSummary(entry: CatalogEntry): string {
  const profile = profileOf(entry);
  const parts = [previewModeLabel(entry), previewCostLabel(entry)];
  if (profile.requires.length > 0) {
    parts.push(`Requires ${profile.requires.map(requirementLabel).join(", ")}`);
  }
  if (profile.failureReason) parts.push(profile.failureReason);
  return parts.join(" · ");
}

export function layoutStyle(entry: CatalogEntry): CSSProperties {
  const profile = profileOf(entry);
  return {
    "--rl-card-span": String(profile.gridColumnSpan),
    "--rl-card-row-span": String(profile.gridRowSpan),
    "--rl-preview-aspect": profile.aspectRatio.replace(/\s+/g, " "),
    "--rl-preview-min-height": `${profile.minHeight}px`,
  } as CSSProperties;
}

export function layoutClassName(entry: CatalogEntry): string {
  return `rl-gallery-card--${profileOf(entry).layout}`;
}

export function hasUsablePreview(entry: CatalogEntry): boolean {
  const profile = profileOf(entry);
  if (profile.previewStatus === "external") return Boolean(entry.preview?.url || entry.sourceUrl);
  if (profile.previewStatus === "ready") return profile.mode === "live" || Boolean(snapshotUrl(entry));
  return false;
}
