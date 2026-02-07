import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { TeamCrest } from './scraper';
import { getCachedCrests, mergeCrestsIntoCache } from './cache';

type CrestContextValue = {
  crests: Record<string, string>;
  mergeCrests: (newCrests: TeamCrest[]) => Promise<void>;
};

const CrestContext = createContext<CrestContextValue | null>(null);

export function CrestProvider({ children }: { children: React.ReactNode }) {
  const [crests, setCrests] = useState<Record<string, string>>({});

  useEffect(() => {
    getCachedCrests().then(setCrests);
  }, []);

  const mergeCrests = useCallback(async (newCrests: TeamCrest[]) => {
    const next = await mergeCrestsIntoCache(newCrests);
    setCrests(next);
  }, []);

  return (
    <CrestContext.Provider value={{ crests, mergeCrests }}>
      {children}
    </CrestContext.Provider>
  );
}

export function useCrests(): CrestContextValue {
  const ctx = useContext(CrestContext);
  if (!ctx) throw new Error('useCrests must be used within CrestProvider');
  return ctx;
}
