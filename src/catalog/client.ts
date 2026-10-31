// Typed read access to the canonical data files.
// The app is a VIEW of the canonical catalog (catalog.json + taxonomy/*.json);
// all mutation lives in the hand-maintained files and stays validator-governed.
import catalogJson from "../../catalog/catalog.json";
import themesJson from "../../taxonomy/themes.json";
import categoriesJson from "../../taxonomy/categories.json";
import aestheticsJson from "../../taxonomy/aesthetics.json";
import attributesJson from "../../taxonomy/attributes.json";
import behaviorsJson from "../../taxonomy/behaviors.json";
import sourcesJson from "../../taxonomy/sources.json";
import typesJson from "../../taxonomy/types.json";
import triggersJson from "../../taxonomy/triggers.json";
import techniquesJson from "../../taxonomy/techniques.json";
import type {
  AestheticDoc,
  AestheticsFile,
  AttributeDoc,
  AttributesFile,
  CatalogEntry,
  CatalogFile,
  CategoriesFile,
  CategoryDoc,
  SourceDoc,
  SourcesFile,
  ThemeDoc,
  ThemesFile,
  BehaviorDoc,
  BehaviorsFile,
  ComponentTypesFile,
  FacetDoc,
  TechniquesFile,
  TriggersFile,
} from "./types";

export const catalog = catalogJson as unknown as CatalogFile;
const themesDoc = themesJson as unknown as ThemesFile;
const categoriesDoc = categoriesJson as unknown as CategoriesFile;
const aestheticsDoc = aestheticsJson as unknown as AestheticsFile;
const attributesDoc = attributesJson as unknown as AttributesFile;
const behaviorsDoc = behaviorsJson as unknown as BehaviorsFile;
const sourcesDoc = sourcesJson as unknown as SourcesFile;
const componentTypesDoc = typesJson as unknown as ComponentTypesFile;
const triggersDoc = triggersJson as unknown as TriggersFile;
const techniquesDoc = techniquesJson as unknown as TechniquesFile;

export const entries: CatalogEntry[] = catalog.entries;
export const themes: ThemeDoc[] = themesDoc.themes;
export const categories: CategoryDoc[] = categoriesDoc.categories;
export const aesthetics: AestheticDoc[] = aestheticsDoc.aesthetics;
export const attributes: AttributeDoc[] = attributesDoc.attributes;
export const behaviors: BehaviorDoc[] = behaviorsDoc.behaviors;
export const sources: SourceDoc[] = sourcesDoc.sources;
export const componentTypes: FacetDoc[] = componentTypesDoc.types;
export const triggers: FacetDoc[] = triggersDoc.triggers;
export const techniques: FacetDoc[] = techniquesDoc.techniques;

export const catalogCounts = {
  entries: entries.length,
  themes: themes.length,
  categories: categories.length,
  aesthetics: aesthetics.length,
  types: componentTypes.length,
  triggers: triggers.length,
  techniques: techniques.length,
  sources: sources.length,
} as const;

export function findEntry(id: string): CatalogEntry | undefined {
  return entries.find((entry) => entry.id === id);
}

export function themeById(id: string): ThemeDoc | undefined {
  return themes.find((theme) => theme.id === id);
}

export function categoryById(id: string): CategoryDoc | undefined {
  return categories.find((category) => category.id === id);
}

export function aestheticById(id: string): AestheticDoc | undefined {
  return aesthetics.find((aesthetic) => aesthetic.id === id);
}

export function attributeById(id: string): AttributeDoc | undefined {
  return attributes.find((attribute) => attribute.id === id);
}

export function behaviorById(id: string): BehaviorDoc | undefined {
  return behaviors.find((behavior) => behavior.id === id);
}

export function componentTypeById(id: string): FacetDoc | undefined {
  return componentTypes.find((type) => type.id === id);
}

export function triggerById(id: string): FacetDoc | undefined {
  return triggers.find((trigger) => trigger.id === id);
}

export function techniqueById(id: string): FacetDoc | undefined {
  return techniques.find((technique) => technique.id === id);
}

export function sourceById(id: string): SourceDoc | undefined {
  return sources.find((source) => source.id === id);
}

/** Statuses in display order; drives status badges/chips in the browser UI. */
export const ENTRY_STATUSES = ["stable", "beta", "experimental", "deprecated"] as const;
