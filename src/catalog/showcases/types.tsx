// Showcase types (M6.2, MASTER_SPEC M6.2). A "showcase" is a reviewed wrapper
// around one vendored component: the preview workspace renders only through
// this registry, so ingested code is never executed directly by the app.
// Control specs drive the workspace's per-entry customization form.
import type { ComponentType } from "react";

export type ShowcaseControlType = "text" | "number" | "select" | "boolean";

export interface ShowcaseControl {
  /** Prop name passed to the component. */
  id: string;
  label: string;
  type: ShowcaseControlType;
  /** Default value; also the value used inside the gallery mini previews. */
  default: string | number | boolean;
  options?: string[];
  min?: number;
  max?: number;
  step?: number;
}

export interface ShowcaseValues {
  [controlId: string]: string | number | boolean;
}

export interface Showcase {
  /** Catalog entry id this showcase renders. */
  id: string;
  /** Wrapped component with defaults pre-applied. */
  Component: ComponentType<ShowcaseValues>;
  /** Property controls offered in the preview workspace. */
  controls?: ShowcaseControl[];
  /** Expensive previews are gated out of gallery auto-play. */
  heavy?: boolean;
  /** Pointer/keyboard hint shown under the stage. */
  hint?: string;
  /** Preferred stage background mode: "neutral" | "inverted" | "grid". */
  stage?: "neutral" | "inverted" | "grid";
}

export type ShowcaseDefaults = Record<string, string | number | boolean>;

/** Wraps a vendored component with its showcase defaults, merging any
 *  workspace-resolved control values on top (identity prop names). */
export function defineShowcase(
  id: string,
  Raw: ComponentType<ShowcaseValues>,
  defaults: ShowcaseDefaults = {},
  extra: Partial<Omit<Showcase, "id" | "Component" | "Raw">> = {},
): Showcase {
  const Component: ComponentType<ShowcaseValues> = (values) => <Raw {...defaults} {...values} />;
  return { id, Component, ...extra };
}
