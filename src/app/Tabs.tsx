import { useState, type ReactNode } from "react";

export interface TabDef {
  id: string;
  label: string;
  panel: ReactNode;
}

interface TabsProps {
  tabs: readonly TabDef[];
  ariaLabel: string;
  idPrefix: string;
}

/**
 * Only the active panel is mounted (matches the route-switch pattern in App.tsx),
 * so switching tabs doesn't run every panel's data hooks at once.
 */
export function Tabs({ tabs, ariaLabel, idPrefix }: TabsProps) {
  const [activeId, setActiveId] = useState(tabs[0]?.id);
  const active = tabs.find((t) => t.id === activeId) ?? tabs[0];

  return (
    <div className="tabs">
      <div role="tablist" aria-label={ariaLabel} className="tabs__list">
        {tabs.map((tab) => {
          const selected = tab.id === active?.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`${idPrefix}-tab-${tab.id}`}
              aria-selected={selected}
              aria-controls={`${idPrefix}-panel-${tab.id}`}
              tabIndex={selected ? 0 : -1}
              className={selected ? "tabs__tab tabs__tab--active" : "tabs__tab"}
              onClick={() => setActiveId(tab.id)}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      {active ? (
        <div
          role="tabpanel"
          id={`${idPrefix}-panel-${active.id}`}
          aria-labelledby={`${idPrefix}-tab-${active.id}`}
          className="tabs__panel"
        >
          {active.panel}
        </div>
      ) : null}
    </div>
  );
}
