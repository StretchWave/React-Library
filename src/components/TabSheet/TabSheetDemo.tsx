// TabSheet demo — three panels showing the tabs pattern.
import { TabSheet } from "./TabSheet";

export function TabSheetDemo() {
  return (
    <div data-demo-id="tabs" className="rl-demo">
      <TabSheet
        items={[
          {
            id: "overview",
            label: "Overview",
            content:
              "Tabs pair a labeled set of tabs with one visible panel. Core WAI-ARIA wiring ships in v0.2.",
          },
          {
            id: "roadmap",
            label: "Roadmap",
            content:
              "Arrow-key navigation and roving tabindex land in milestone M4 of the master spec.",
          },
          {
            id: "api",
            label: "API",
            content: "items: TabItem[] — { id, label, content }; initialTab selects the first panel.",
          },
        ]}
      />
    </div>
  );
}
