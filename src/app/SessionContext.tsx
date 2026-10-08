import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { Participant, PromoCodeResult, SessionState } from '../types/promo';
import { readLastResult, storeLastResult } from './resultStorage';

/**
 * Estado de UI. El último resultado se conserva en esta pestaña al recargar.
 * El caché no adjudica premios ni vuelve a enviar el código al backend.
 */
interface SessionContextValue extends SessionState {
  setParticipant: (p: Participant | null) => void;
  setLastResult: (r: PromoCodeResult | null) => void;
  setCodeCount: (n: number) => void;
  acceptTerms: () => void;
  reset: () => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [lastResult, setLastResultState] = useState<PromoCodeResult | null>(readLastResult);
  const [codeCount, setCodeCount] = useState(() => lastResult?.codeCount ?? 0);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const setLastResult = useCallback((r: PromoCodeResult | null) => {
    storeLastResult(r);
    setLastResultState(r);
    if (r) setCodeCount(r.codeCount);
  }, []);

  const reset = useCallback(() => {
    storeLastResult(null);
    setParticipant(null);
    setCodeCount(0);
    setLastResultState(null);
    setAcceptedTerms(false);
  }, []);

  const value = useMemo<SessionContextValue>(
    () => ({
      participant,
      codeCount,
      lastResult,
      acceptedTerms,
      setParticipant,
      setLastResult,
      setCodeCount,
      acceptTerms: () => setAcceptedTerms(true),
      reset,
    }),
    [participant, codeCount, lastResult, acceptedTerms, setLastResult, reset],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession debe usarse dentro de <SessionProvider>');
  return ctx;
}
