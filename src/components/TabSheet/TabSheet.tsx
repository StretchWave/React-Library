// TabSheet (catalog id: tabs). WAI-ARIA tabs pattern: role wiring, arrow-key
// navigation with roving tabindex, and selection-follows-focus (M4).
import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
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

function isArrowKey(key: string): boolean {
  return key === "ArrowRight" || key === "ArrowLeft" || key === "Home" || key === "End";
}

export function TabSheet({ items, initialTab }: TabSheetProps) {
  const uid = useId();
  const initial = items.find((item) => item.id === initialTab)?.id ?? items[0]?.id;
  const [activeId, setActiveId] = useState<string | undefined>(initial);
  const active = items.find((item) => item.id === activeId) ?? items[0];
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  if (items.length === 0 || !active) return null;

  function onTabListKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!isArrowKey(event.key)) return;
    event.preventDefault();
    const currentIndex = items.indexOf(active);
    let nextIndex: number;
    if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % items.length;
    else if (event.key === "ArrowLeft") nextIndex = (currentIndex - 1 + items.length) % items.length;
    else if (event.key === "Home") nextIndex = 0;
    else nextIndex = items.length - 1;

    const next = items[nextIndex];
    if (!next) return;
    setActiveId(next.id);
    // Selection follows focus: move the DOM focus to the newly active tab.
    tabRefs.current[next.id]?.focus();
  }

  return (
    <div className="rl-tabsheet">
      <div role="tablist" aria-label="TabSheet" className="rl-tabsheet__list" onKeyDown={onTabListKeyDown}>
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
              ref={(node) => {
                tabRefs.current[item.id] = node;
              }}
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
