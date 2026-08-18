'use client';

import { useRef, useMemo, useState, useEffect, useContext, createContext } from 'react';

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
  // Keyed by a per-registrant id so multiple components on the same page
  // (e.g. AppraisalTctTable's Auto-assign/Unassign All TCTs alongside
  // AppraisalAppraiserView's Simulate Approve/Decline) each keep their own
  // slot instead of the last one to register overwriting everyone else's.
  setActionsFor: (registrantId: string, actions: AdminPageAction[]) => void;
};

const PageActionsContext = createContext<PageActionsContextValue | null>(null);

let registrantCounter = 0;

export function AdminPageActionsProvider({ children }: { children: React.ReactNode }) {
  const [actionsByRegistrant, setActionsByRegistrant] = useState<Record<string, AdminPageAction[]>>({});

  const setActionsFor = (registrantId: string, actions: AdminPageAction[]) => {
    setActionsByRegistrant((prev) => {
      if (actions.length === 0) {
        if (!(registrantId in prev)) return prev;
        const next = { ...prev };
        delete next[registrantId];
        return next;
      }
      return { ...prev, [registrantId]: actions };
    });
  };

  const actions = useMemo(() => Object.values(actionsByRegistrant).flat(), [actionsByRegistrant]);

  const value = useMemo(() => ({ actions, setActionsFor }), [actions]);

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
// and enabled/disabled state. Each call site gets its own stable registrant
// id (assigned once, on first mount) so independent components registering
// at the same time merge instead of one clobbering another.
export function useRegisterPageActions(actions: AdminPageAction[]) {
  const { setActionsFor } = usePageActionsContext();
  const registrantId = useRef<string>();
  if (!registrantId.current) {
    registrantCounter += 1;
    registrantId.current = `registrant-${registrantCounter}`;
  }

  useEffect(() => {
    setActionsFor(registrantId.current!, actions);
    return () => setActionsFor(registrantId.current!, []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actions]);
}

export function usePageActions() {
  return usePageActionsContext().actions;
}
