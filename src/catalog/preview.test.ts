// Preview-profile decisions are data-driven and deliberately conservative:
// expensive/external/error previews must never masquerade as live content.
import { describe, expect, it } from "vitest";
import { entries, findEntry } from "../catalog/client";
import type { CatalogEntry, PreviewProfile } from "../catalog/types";
import {
  canShowLive,
  hasUsablePreview,
  layoutClassName,
  layoutStyle,
  loopUrl,
  preferredPreviewKind,
  previewCostLabel,
  previewModeLabel,
  previewStatusLabel,
  previewSummary,
  profileOf,
  requirementLabel,
  snapshotUrl,
} from "./preview";

const base = findEntry("button") as CatalogEntry;

function withProfile(overrides: Partial<PreviewProfile>): CatalogEntry {
  return {
    ...base,
    previewProfile: { ...base.previewProfile, ...overrides },
  };
}

function synthetic(overrides: Partial<CatalogEntry>): CatalogEntry {
  return { ...base, ...overrides } as CatalogEntry;
}

describe("profileOf fallbacks", () => {
  it("treats external references as external even without a preview record", () => {
    const external = synthetic({
      id: "synthetic-external",
      entryType: "external",
      preview: undefined,
      previewProfile: undefined as unknown as PreviewProfile,
      heavy: undefined,
      sourceUrl: "https://example.test",
    });
    expect(profileOf(external)).toMatchObject({
      mode: "external",
      previewStatus: "external",
      layout: "standard",
      cost: "low",
      autoplayAllowed: false,
    });
  });

  it("maps preview:none to unavailable and heavy entries to high cost", () => {
    const none = synthetic({
      preview: { type: "none", note: "No safe demo" },
      previewProfile: undefined as unknown as PreviewProfile,
      heavy: false,
    });
    expect(profileOf(none)).toMatchObject({
      mode: "unavailable",
      previewStatus: "unavailable",
      failureReason: "No safe demo",
    });
    const heavy = synthetic({
      previewProfile: undefined as unknown as PreviewProfile,
      heavy: true,
    });
    expect(profileOf(heavy)).toMatchObject({
      mode: "snapshot",
      cost: "high",
      requires: ["gpu"],
      expandedRecommended: true,
    });
  });

  it("keeps published profiles authoritative", () => {
    expect(profileOf(base)).toEqual(base.previewProfile);
  });
});

describe("preview URLs and labels", () => {
  it("converts repo-relative snapshot and loop paths to public URLs", () => {
    expect(snapshotUrl(base)).toBe("/previews/button.jpg");
    expect(loopUrl(base)).toBeUndefined();
    const loop = withProfile({ loopPath: "public/previews/button.mp4" });
    expect(loopUrl(loop)).toBe("/previews/button.mp4");
    const remote = withProfile({ snapshotPath: "https://cdn.example.test/button.jpg" });
    expect(snapshotUrl(remote)).toBe("https://cdn.example.test/button.jpg");
    const windows = withProfile({ snapshotPath: "public\\previews\\button.jpg" });
    expect(snapshotUrl(windows)).toBe("/previews/button.jpg");
    expect(snapshotUrl(withProfile({ snapshotPath: undefined }))).toBeUndefined();
  });

  it("uses honest status, mode and cost labels", () => {
    expect(previewStatusLabel(base)).toBe("Live");
    expect(previewStatusLabel(withProfile({ cost: "high" }))).toBe("Live workspace");
    expect(previewStatusLabel(withProfile({ mode: "snapshot" }))).toBe("Snapshot");
    expect(previewStatusLabel(withProfile({ mode: "loop" }))).toBe("Loop");
    expect(previewStatusLabel(withProfile({ previewStatus: "external" }))).toBe(
      "External reference",
    );
    expect(previewStatusLabel(withProfile({ previewStatus: "unavailable" }))).toBe(
      "No local preview",
    );
    expect(previewStatusLabel(withProfile({ previewStatus: "error" }))).toBe("Preview error");

    expect(previewModeLabel(base)).toBe("Live preview");
    expect(previewModeLabel(withProfile({ mode: "snapshot" }))).toBe("Captured snapshot");
    expect(previewModeLabel(withProfile({ mode: "loop" }))).toBe("Captured loop");
    expect(previewModeLabel(withProfile({ mode: "external" }))).toBe("External reference");
    expect(previewModeLabel(withProfile({ mode: "unavailable" }))).toBe("Unavailable");
    expect(previewCostLabel(base)).toBe("Low cost");
    expect(previewCostLabel(withProfile({ cost: "medium" }))).toBe("Medium cost");
    expect(previewCostLabel(withProfile({ cost: "high" }))).toBe("High cost");
  });

  it("labels every requirement and summarizes the profile", () => {
    expect(requirementLabel("webgl")).toBe("WebGL");
    expect(requirementLabel("canvas-2d")).toBe("Canvas 2D");
    expect(requirementLabel("pointer")).toBe("Pointer");
    expect(requirementLabel("keyboard")).toBe("Keyboard");
    expect(requirementLabel("scroll")).toBe("Scroll");
    expect(requirementLabel("gpu")).toBe("GPU");
    expect(requirementLabel("user-input")).toBe("User input");
    expect(requirementLabel("reduced-motion")).toBe("Reduced motion");

    const split = findEntry("react-bits-split-text") as CatalogEntry;
    expect(previewSummary(split)).toBe("Live preview · Medium cost");
    const high = withProfile({ cost: "high", requires: ["gpu", "pointer"] });
    expect(previewSummary(high)).toContain("High cost");
    expect(previewSummary(high)).toContain("Requires GPU, Pointer");
    const failed = withProfile({ previewStatus: "error", failureReason: "WebGL context lost" });
    expect(previewSummary(failed)).toContain("WebGL context lost");
  });
});

describe("live-preview gating", () => {
  it("allows only low/medium autoplay previews when visible and motion is allowed", () => {
    const split = findEntry("react-bits-split-text") as CatalogEntry;
    expect(split.previewProfile).toMatchObject({
      mode: "live",
      cost: "medium",
      autoplayAllowed: true,
    });
    expect(canShowLive(split)).toBe(true);
    expect(canShowLive(split, { globalPaused: true })).toBe(false);
    expect(canShowLive(split, { reducedMotion: true })).toBe(false);
    expect(canShowLive(split, { visible: false })).toBe(false);
    expect(canShowLive(base)).toBe(false);
  });

  it("lets a deliberate hover run non-autoplay entries without bypassing safety gates", () => {
    expect(canShowLive(base)).toBe(false);
    expect(canShowLive(base, { forceLive: true })).toBe(true);
    expect(preferredPreviewKind(base, { forceLive: true })).toBe("live");
    expect(canShowLive(base, { forceLive: true, globalPaused: true })).toBe(false);
    expect(canShowLive(base, { forceLive: true, reducedMotion: true })).toBe(false);
    expect(canShowLive(base, { forceLive: true, visible: false })).toBe(false);
    expect(canShowLive(withProfile({ cost: "high", autoplayAllowed: true }), { forceLive: true })).toBe(false);
  });

  it("never autoplays high-cost, external, unavailable or error previews", () => {
    expect(canShowLive(withProfile({ cost: "high", autoplayAllowed: true }))).toBe(false);
    expect(canShowLive(withProfile({ mode: "external", autoplayAllowed: true }))).toBe(false);
    expect(canShowLive(withProfile({ previewStatus: "unavailable" }))).toBe(false);
    expect(canShowLive(withProfile({ previewStatus: "error" }))).toBe(false);
    expect(canShowLive(synthetic({ heavy: true, previewProfile: undefined as unknown as PreviewProfile }))).toBe(
      false,
    );
  });

  it("selects live, snapshot, external or unavailable honestly", () => {
    const split = findEntry("react-bits-split-text") as CatalogEntry;
    expect(preferredPreviewKind(split)).toBe("live");
    expect(preferredPreviewKind(split, { globalPaused: true })).toBe("snapshot");
    expect(preferredPreviewKind(split, { reducedMotion: true })).toBe("snapshot");
    expect(preferredPreviewKind(split, { visible: false })).toBe("snapshot");
    expect(preferredPreviewKind(base)).toBe("snapshot");
    expect(preferredPreviewKind(findEntry("shadcn-button") as CatalogEntry)).toBe("external");

    const unavailable = withProfile({
      mode: "unavailable",
      previewStatus: "unavailable",
      snapshotPath: undefined,
    });
    expect(preferredPreviewKind(unavailable)).toBe("unavailable");
    const snapshotOnly = withProfile({
      mode: "snapshot",
      previewStatus: "ready",
      autoplayAllowed: false,
      snapshotPath: "public/previews/button.jpg",
    });
    expect(preferredPreviewKind(snapshotOnly)).toBe("snapshot");
    const missingSnapshot = withProfile({
      mode: "snapshot",
      previewStatus: "ready",
      snapshotPath: undefined,
    });
    expect(preferredPreviewKind(missingSnapshot)).toBe("unavailable");
  });
});

describe("preview usability and layout", () => {
  it("requires an official link for external usability and a real asset for local previews", () => {
    expect(hasUsablePreview(base)).toBe(true);
    expect(hasUsablePreview(findEntry("shadcn-button") as CatalogEntry)).toBe(true);
    const externalNoUrl = synthetic({
      entryType: "external",
      preview: { type: "external" },
      previewProfile: withProfile({ previewStatus: "external" }).previewProfile,
      sourceUrl: undefined,
    });
    expect(hasUsablePreview(externalNoUrl)).toBe(false);
    expect(hasUsablePreview(withProfile({ previewStatus: "unavailable" }))).toBe(false);
    expect(hasUsablePreview(withProfile({ previewStatus: "error" }))).toBe(false);
  });

  it("publishes layout spans and class names from the profile", () => {
    const wide = withProfile({
      layout: "wide",
      gridColumnSpan: 2,
      gridRowSpan: 1,
      minHeight: 280,
      aspectRatio: "16 / 9",
    });
    expect(layoutClassName(wide)).toBe("rl-gallery-card--wide");
    expect(layoutStyle(wide)).toMatchObject({
      "--rl-card-span": "2",
      "--rl-card-row-span": "1",
      "--rl-preview-aspect": "16 / 9",
      "--rl-preview-min-height": "280px",
    });
  });

  it("keeps every catalog preview honest and resolvable", () => {
    for (const entry of entries) {
      const profile = profileOf(entry);
      expect(["live", "snapshot", "loop", "external", "unavailable"]).toContain(profile.mode);
      expect(["ready", "external", "unavailable", "error"]).toContain(profile.previewStatus);
      if (profile.previewStatus === "ready") {
        expect(profile.mode).toBe("live");
        expect(snapshotUrl(entry)).toMatch(/^\/previews\/.+\.(jpg|png|webp)$/);
      }
      if (profile.previewStatus === "external") expect(profile.mode).toBe("external");
    }
  });
});
