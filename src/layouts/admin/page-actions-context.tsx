'use client';

import { useMemo, useState, useEffect, useContext, createContext } from 'react';

// ----------------------------------------------------------------------

export type AdminPageAction = {
  key: string;
  label: string;
  icon: string;
  onClick: () => void;
  color?: string;
};

type PageActionsContextValue = {
  actions: AdminPageAction[];
  setActions: (actions: AdminPageAction[]) => void;
};

const PageActionsContext = createContext<PageActionsContextValue | null>(null);

export function AdminPageActionsProvider({ children }: { children: React.ReactNode }) {
  const [actions, setActions] = useState<AdminPageAction[]>([]);

  const value = useMemo(() => ({ actions, setActions }), [actions]);

  return <PageActionsContext.Provider value={value}>{children}</PageActionsContext.Provider>;
}

function usePageActionsContext() {
  const context = useContext(PageActionsContext);
  if (!context) {
    throw new Error('usePageActionsContext must be used within AdminPageActionsProvider');
  }
  return context;
}

// Lets any admin view register its own floating dev/test actions (e.g. "Fill
// with Sample Data") into the single shared settings popover instead of
// rendering its own stacked floating buttons. Registers on mount, clears on
// unmount so actions never leak into a page that didn't ask for them; re-runs
// whenever `actions` changes so the popover always reflects current handlers
// and enabled/disabled state.
export function useRegisterPageActions(actions: AdminPageAction[]) {
  const { setActions } = usePageActionsContext();

  useEffect(() => {
    setActions(actions);
    return () => setActions([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actions]);
}

export function usePageActions() {
  return usePageActionsContext().actions;
}
