// TabSheet (catalog id: tabs, beta). Core WAI-ARIA tabs pattern is implemented
// in v0.2; keyboard arrow navigation + roving tabindex are scheduled for M4
// (catalog a11yNotes documents this).
import { useId, useState, type ReactNode } from "react";
import "./TabSheet.css";

export interface TabItem {
  id: string;
  label: string;
  content: ReactNode;
}

export interface TabSheetProps {
  items: TabItem[];
  initialTab?: string;
}

export function TabSheet({ items, initialTab }: TabSheetProps) {
  const uid = useId();
  const initial = items.find((item) => item.id === initialTab)?.id ?? items[0]?.id;
  const [activeId, setActiveId] = useState<string | undefined>(initial);
  const active = items.find((item) => item.id === activeId) ?? items[0];

  if (items.length === 0 || !active) return null;

  return (
    <div className="rl-tabsheet">
      <div role="tablist" aria-label="TabSheet" className="rl-tabsheet__list">
        {items.map((item) => {
          const selected = item.id === active.id;
          const tabId = `${uid}-tab-${item.id}`;
          const panelId = `${uid}-panel-${item.id}`;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              id={tabId}
              className={selected ? "rl-tabsheet__tab is-active" : "rl-tabsheet__tab"}
              aria-selected={selected}
              aria-controls={panelId}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActiveId(item.id)}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      <div
        role="tabpanel"
        id={`${uid}-panel-${active.id}`}
        aria-labelledby={`${uid}-tab-${active.id}`}
        className="rl-tabsheet__panel"
      >
        {active.content}
      </div>
    </div>
  );
}
