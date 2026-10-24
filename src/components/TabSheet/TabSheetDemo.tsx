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
              "Tabs pair a labeled set of tabs with one visible panel; focus the tablist and use ←/→ (Home/End).",
          },
          {
            id: "a11y",
            label: "Accessibility",
            content:
              "Selection follows focus with a roving tabindex — only the active tab is in the tab order.",
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
