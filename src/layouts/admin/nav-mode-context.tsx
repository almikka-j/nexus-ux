'use client';

import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';

// ----------------------------------------------------------------------

export type AdminNavMode = 'top' | 'side';

const STORAGE_KEY = 'admin-nav-mode';
const DEFAULT_MODE: AdminNavMode = 'top';

type AdminNavModeContextValue = {
  navMode: AdminNavMode;
  setNavMode: (mode: AdminNavMode) => void;
};

const AdminNavModeContext = createContext<AdminNavModeContextValue | null>(null);

export function AdminNavModeProvider({ children }: { children: React.ReactNode }) {
  const [navMode, setNavModeState] = useState<AdminNavMode>(DEFAULT_MODE);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'top' || stored === 'side') {
      setNavModeState(stored);
    }
  }, []);

  const setNavMode = useCallback((mode: AdminNavMode) => {
    setNavModeState(mode);
    window.localStorage.setItem(STORAGE_KEY, mode);
  }, []);

  const value = useMemo(() => ({ navMode, setNavMode }), [navMode, setNavMode]);

  return <AdminNavModeContext.Provider value={value}>{children}</AdminNavModeContext.Provider>;
}

export function useAdminNavMode() {
  const context = useContext(AdminNavModeContext);
  if (!context) {
    throw new Error('useAdminNavMode must be used within AdminNavModeProvider');
  }
  return context;
}
