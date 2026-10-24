// Demo registry: entry id → demo component (also listed in catalog `usedFrom`).
import type { ComponentType } from "react";
import { AlertDemo } from "../components/Alert/AlertDemo";
import { BadgeDemo } from "../components/Badge/BadgeDemo";
import { ButtonDemo } from "../components/Button/ButtonDemo";
import { CardDemo } from "../components/Card/CardDemo";
import { TabSheetDemo } from "../components/TabSheet/TabSheetDemo";
import { TextInputDemo } from "../components/TextInput/TextInputDemo";

export const demos: Record<string, ComponentType> = {
  alert: AlertDemo,
  badge: BadgeDemo,
  button: ButtonDemo,
  card: CardDemo,
  tabs: TabSheetDemo,
  "text-input": TextInputDemo,
};

export function getDemo(entryId: string): ComponentType | undefined {
  return demos[entryId];
}
