/** Active tab of the Inventory page (kept in the `?tab=` URL parameter) plus the ARIA tabs wiring: element ids and arrow-key roving focus. */
import { useCallback, useId, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { useSearchParams } from 'react-router';

/** Inventory tabs in tab order; each id is also its `?tab=` value. */
export const INVENTORY_TABS = ['parts', 'labor-types'] as const;

/** One Inventory tab. */
export type InventoryTab = (typeof INVENTORY_TABS)[number];

/** i18n label key of each tab. */
export const INVENTORY_TAB_LABEL_KEYS: Readonly<Record<InventoryTab, string>> = {
  parts: 'inventory.tabs.parts',
  'labor-types': 'inventory.tabs.laborTypes',
};

/** Tab state and ARIA wiring handed to the page. */
export interface InventoryTabs {
  readonly activeTab: InventoryTab;
  /** Id of the page heading that labels the tab list. */
  readonly headingId: string;
  /** Id of the one tab panel; its label follows the active tab. */
  readonly panelId: string;
  readonly getTabId: (tab: InventoryTab) => string;
  readonly selectTab: (tab: InventoryTab) => void;
  readonly handleTabKeyDown: (event: ReactKeyboardEvent<HTMLElement>, tab: InventoryTab) => void;
}

/** The tab named by `?tab=`; anything other than `labor-types` falls back to `parts`. */
function resolveActiveTab(searchParams: URLSearchParams): InventoryTab {
  return searchParams.get('tab') === 'labor-types' ? 'labor-types' : 'parts';
}

/** The tab a Left/Right/Home/End key moves to from `current` (the arrows wrap around), or null for any other key. */
function resolveTabKeyTarget(key: string, current: InventoryTab): InventoryTab | null {
  const lastIndex = INVENTORY_TABS.length - 1;
  const index = INVENTORY_TABS.indexOf(current);

  switch (key) {
    case 'ArrowRight':
      return INVENTORY_TABS[index === lastIndex ? 0 : index + 1] ?? current;
    case 'ArrowLeft':
      return INVENTORY_TABS[index === 0 ? lastIndex : index - 1] ?? current;
    case 'Home':
      return INVENTORY_TABS[0];
    case 'End':
      return INVENTORY_TABS[lastIndex] ?? current;
    default:
      return null;
  }
}

/** Reads and writes the active tab in the URL and builds the ids and keyboard handler of the tabs pattern. */
export function useInventoryTabs(): InventoryTabs {
  const [searchParams, setSearchParams] = useSearchParams();
  const idPrefix = useId();
  const activeTab = resolveActiveTab(searchParams);

  const getTabId = useCallback((tab: InventoryTab) => `${idPrefix}-tab-${tab}`, [idPrefix]);

  const selectTab = useCallback((tab: InventoryTab) => {
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);
      next.set('tab', tab);
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const handleTabKeyDown = useCallback((event: ReactKeyboardEvent<HTMLElement>, tab: InventoryTab) => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
      return;
    }

    const target = resolveTabKeyTarget(event.key, tab);

    if (target === null) {
      return;
    }

    event.preventDefault();
    selectTab(target);
    document.getElementById(getTabId(target))?.focus();
  }, [getTabId, selectTab]);

  return {
    activeTab,
    headingId: `${idPrefix}-heading`,
    panelId: `${idPrefix}-panel`,
    getTabId,
    selectTab,
    handleTabKeyDown,
  };
}
