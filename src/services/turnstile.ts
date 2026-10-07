/**
 * Cloudflare Turnstile — sólo el cableado del token.
 * -------------------------------------------------------------------------
 * Reemplaza a reCAPTCHA v3. Lo que cambia:
 *
 *   - El widget se renderiza UNA vez (ver `TurnstileHost`) y el desafío corre
 *     en segundo plano desde que carga la página. Casi nunca se ve; si
 *     Cloudflare necesita un click, aparece en la esquina del host.
 *   - El token es de UN SOLO USO y vive 5 minutos. Después de cada canje hay
 *     que llamar a `resetTurnstile()` para que arranque un desafío nuevo.
 *   - El backend (POST /api/v2/codes/redeem) es estricto: sin token responde
 *     403. Por eso `getTurnstileToken` ESPERA hasta 20 s en vez de mandar el
 *     canje sin token.
 *
 * Mientras `VITE_TURNSTILE_SITE_KEY` esté vacía no se carga nada de Cloudflare
 * y el canje viaja sin token: la demo con el adapter mock sigue igual.
 *
 * Reparto de responsabilidades:
 *   Frontend  obtiene el token y lo manda junto al código.
 *   Backend   lo verifica contra Cloudflare ANTES de mirar el código, con la
 *             clave secreta —que nunca sale del servidor—.
 */

/** Clave pública del sitio. Vacía = Turnstile apagado. */
const SITE_KEY: string = (import.meta.env.VITE_TURNSTILE_SITE_KEY ?? '').trim();

const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
/** La misma acción que el backend compara en Siteverify. */
const ACTION = 'redeem_code';
/** Cuánto espera un canje a que el desafío en segundo plano entregue el token. */
const TOKEN_WAIT_MS = 20_000;
/** Cuánto se espera a que cargue api.js antes de darlo por perdido. */
const SCRIPT_WAIT_MS = 60_000;

export interface TurnstileHooks {
  /** Cloudflare va a mostrar el checkbox: el host se hace visible. */
  onInteractiveStart?: () => void;
  onInteractiveEnd?: () => void;
}

export function isTurnstileEnabled(): boolean {
  return SITE_KEY.length > 0;
}

// ---- Estado del módulo: un solo widget por página ----
let widgetId: string | null = null;
let token = '';
let waiters: Array<(value: string | undefined) => void> = [];
let scriptPromise: Promise<void> | null = null;

function resolveWaiters(value: string | undefined): void {
  const pending = waiters;
  waiters = [];
  for (const resolve of pending) resolve(value);
}

/** Inyecta api.js una sola vez y resuelve cuando `window.turnstile` existe. */
function loadScript(): Promise<void> {
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<void>((resolve, reject) => {
    if (window.turnstile) {
      resolve();
      return;
    }
    const timer = window.setTimeout(
      () => reject(new Error('Turnstile no cargó a tiempo')),
      SCRIPT_WAIT_MS,
    );
    const el = document.createElement('script');
    el.src = SCRIPT_URL;
    el.async = true;
    el.defer = true;
    el.onload = () => {
      window.clearTimeout(timer);
      if (window.turnstile) resolve();
      else reject(new Error('api.js cargó pero window.turnstile no existe'));
    };
    el.onerror = () => {
      window.clearTimeout(timer);
      reject(new Error('No se pudo cargar Turnstile'));
    };
    document.head.appendChild(el);
  });
  return scriptPromise;
}

/**
 * Renderiza el widget UNA vez dentro de `container`. Idempotente: con un widget
 * ya montado no hace nada. Nunca lanza: si Cloudflare no carga queda en la
 * consola y `getTurnstileToken` devuelve `undefined` al vencer la espera.
 */
export function mountTurnstile(container: HTMLElement, hooks: TurnstileHooks = {}): void {
  if (!isTurnstileEnabled() || widgetId !== null) return;

  void loadScript()
    .then(() => {
      // Pudo montarse dos veces mientras cargaba el script (StrictMode), o
      // desmontarse: sólo renderiza el primero y sólo si el nodo sigue vivo.
      if (widgetId !== null || !container.isConnected) return;
      const turnstile = window.turnstile;
      if (!turnstile) return;

      const id = turnstile.render(container, {
        sitekey: SITE_KEY,
        action: ACTION,
        appearance: 'interaction-only',
        execution: 'render',
        size: 'normal',
        language: 'es',
        theme: 'dark',
        callback: (value: string) => {
          token = value;
          resolveWaiters(value);
        },
        'expired-callback': () => {
          // Turnstile lo renueva solo; el próximo `callback` trae el nuevo.
          token = '';
        },
        'timeout-callback': () => {
          resetTurnstile();
        },
        'error-callback': (code: string) => {
          token = '';
          console.warn('[turnstile] error', code);
        },
        'before-interactive-callback': () => hooks.onInteractiveStart?.(),
        'after-interactive-callback': () => hooks.onInteractiveEnd?.(),
      });

      if (!id) {
        console.error('[turnstile] render no devolvió widgetId');
        return;
      }
      widgetId = id;
    })
    .catch((error: unknown) => {
      console.error('[turnstile]', error instanceof Error ? error.message : error);
    });
}

/** Quita el widget y descarta el token y las esperas pendientes. */
export function unmountTurnstile(): void {
  if (widgetId !== null) window.turnstile?.remove(widgetId);
  widgetId = null;
  token = '';
  resolveWaiters(undefined);
}

/**
 * Token vigente, o espera hasta TOKEN_WAIT_MS a que el desafío en segundo plano
 * lo entregue. `undefined` si Turnstile está apagado o si no llegó a tiempo.
 * Nunca lanza.
 */
export function getTurnstileToken(): Promise<string | undefined> {
  if (!isTurnstileEnabled()) return Promise.resolve(undefined);
  if (token) return Promise.resolve(token);

  return new Promise<string | undefined>((resolve) => {
    let timer = 0;
    const settle = (value: string | undefined) => {
      window.clearTimeout(timer);
      resolve(value);
    };
    timer = window.setTimeout(() => {
      waiters = waiters.filter((w) => w !== settle);
      resolve(undefined);
    }, TOKEN_WAIT_MS);
    waiters.push(settle);
  });
}

/** Borra el token y arranca un desafío nuevo: los tokens son de un solo uso. */
export function resetTurnstile(): void {
  token = '';
  if (widgetId !== null) window.turnstile?.reset(widgetId);
}
