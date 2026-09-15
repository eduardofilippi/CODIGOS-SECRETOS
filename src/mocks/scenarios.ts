import type { PromoCodeStatus } from '../types/promo';

/**
 * Interruptor de escenarios para desarrollo.
 * -------------------------------------------------------------------------
 * Permite forzar la respuesta del adapter mock sin tocar las pantallas.
 *
 * Formas de cambiarlo:
 *  1. Query string:  ?scenario=WIN
 *  2. Panel flotante (esquina inferior derecha, sólo en dev)
 *  3. Consola:       window.__PROMO_SCENARIO__ = 'CODE_NOT_FOUND'
 *
 * Con 'BASE' —el valor por defecto— el resultado lo decide el código tipeado,
 * consultando `mocks/codes.ts`: es el comportamiento que tendrá el sitio contra
 * la tabla real. Con 'AUTO' el mock reparte los estados de forma rotativa, útil
 * para recorrer las cuatro pantallas sin conocer ningún código.
 */

export type Scenario = PromoCodeStatus | 'AUTO' | 'BASE';

export const SCENARIOS: Scenario[] = [
  'BASE',
  'AUTO',
  'WIN',
  'LOSE',
  'CODE_ALREADY_USED',
  'CODE_NOT_FOUND',
  'REGISTER_REQUIRED',
  'RATE_LIMITED',
];

export const SCENARIO_LABELS: Record<Scenario, string> = {
  BASE: 'Base de códigos',
  AUTO: 'Automático (rota)',
  WIN: 'Ganaste',
  LOSE: 'Perdiste',
  CODE_ALREADY_USED: 'Código ya utilizado',
  CODE_NOT_FOUND: 'Código inexistente',
  REGISTER_REQUIRED: 'Requiere registro',
  RATE_LIMITED: 'Límite de intentos',
};

const STORAGE_KEY = '__promo_scenario__';

declare global {
  interface Window {
    __PROMO_SCENARIO__?: Scenario;
  }
}

function isScenario(value: unknown): value is Scenario {
  return typeof value === 'string' && (SCENARIOS as string[]).includes(value);
}

let current: Scenario = 'BASE';

/** El acceso a sessionStorage puede lanzar (origen opaco, modo restringido). */
function safeSessionRead(key: string): string | null {
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSessionWrite(key: string, value: string): void {
  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    /* el escenario sigue vivo en memoria */
  }
}

// Bootstrap: query string tiene prioridad sobre lo último elegido en la sesión.
if (typeof window !== 'undefined') {
  const fromQuery = new URLSearchParams(window.location.search).get('scenario');
  const fromSession = safeSessionRead(STORAGE_KEY);
  if (isScenario(fromQuery)) current = fromQuery;
  else if (isScenario(fromSession)) current = fromSession;
  window.__PROMO_SCENARIO__ = current;
}

const listeners = new Set<(s: Scenario) => void>();

export function getScenario(): Scenario {
  if (typeof window !== 'undefined' && isScenario(window.__PROMO_SCENARIO__)) {
    current = window.__PROMO_SCENARIO__;
  }
  return current;
}

export function setScenario(next: Scenario): void {
  current = next;
  if (typeof window !== 'undefined') {
    window.__PROMO_SCENARIO__ = next;
    safeSessionWrite(STORAGE_KEY, next);
  }
  listeners.forEach((l) => l(next));
}

export function subscribeScenario(listener: (s: Scenario) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Latencia simulada. Corta a propósito para poder ver las transiciones. */
export const MOCK_LATENCY_MS = 750;

/* ---------------------------------------------------------------------------
   Premio forzado — SÓLO DESARROLLO / QA
   ---------------------------------------------------------------------------
   Con el escenario 'WIN' el mock entrega un premio distinto cada vez, rotando
   el catálogo, para poder revisar los 19 en la pantalla GANASTE. Este
   interruptor fija uno concreto y desactiva la rotación.

   Formas de usarlo:
     1. Panel flotante (sólo en dev), desplegable "Premio"
     2. Query string:  ?scenario=WIN&prize=skate-mediano
     3. Consola:       window.__PROMO_WIN_PRIZE__ = 'piscina-bestway'

   No tiene ningún efecto con el escenario 'BASE': ahí el premio lo decide el
   código tipeado, igual que lo hará el backend. Nada de esto sobrevive a la
   conexión real: el premio siempre lo asigna el servidor.
   --------------------------------------------------------------------------- */

declare global {
  interface Window {
    __PROMO_WIN_PRIZE__?: string;
  }
}

/** `null` = rotar el catálogo. */
let forcedPrizeId: string | null = null;

if (typeof window !== 'undefined') {
  const fromQuery = new URLSearchParams(window.location.search).get('prize');
  if (fromQuery) {
    forcedPrizeId = fromQuery;
    window.__PROMO_WIN_PRIZE__ = fromQuery;
  }
}

export function getForcedPrizeId(): string | null {
  if (typeof window !== 'undefined' && typeof window.__PROMO_WIN_PRIZE__ === 'string') {
    forcedPrizeId = window.__PROMO_WIN_PRIZE__ || null;
  }
  return forcedPrizeId;
}

export function setForcedPrizeId(id: string | null): void {
  forcedPrizeId = id;
  if (typeof window !== 'undefined') window.__PROMO_WIN_PRIZE__ = id ?? undefined;
  listeners.forEach((l) => l(current));
}
