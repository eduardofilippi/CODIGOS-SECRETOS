/**
 * Cloudflare Turnstile — sólo el cableado del token.
 * -------------------------------------------------------------------------
 * Reemplaza a reCAPTCHA v3. Lo que cambia:
 *
 *   - El widget se renderiza UNA vez (lo hace `TurnstileHost`, en una esquina
 *     fija) y el desafío corre en segundo plano desde que carga la página.
 *     Casi nunca se ve; si Cloudflare necesita un click, aparece ahí.
 *   - El token es de UN SOLO USO y vive 5 minutos. `getTurnstileToken` lo
 *     CONSUME al entregarlo. Si la persona se queda en la pantalla (error,
 *     registro pendiente) `useCodeFlow` llama a `resetTurnstile()` enseguida
 *     para tener token listo al reintentar; si se fue a un resultado, el
 *     desafío nuevo se pide recién en el próximo `getTurnstileToken`.
 *   - El backend (POST /api/v2/codes/redeem) es estricto: sin token responde
 *     403. Por eso `getTurnstileToken` ESPERA hasta 20 s en vez de entregar
 *     nada, salvo que ya se sepa que no va a llegar (api.js no cargó, sitekey
 *     u hostname inválidos): ahí devuelve `undefined` enseguida.
 *
 * Mientras `VITE_TURNSTILE_SITE_KEY` esté vacía no se carga nada de Cloudflare
 * y `useCodeFlow` manda el canje sin token: la demo con el adapter mock sigue
 * igual.
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

/**
 * Prefijos de los códigos de error de Turnstile que no se arreglan esperando:
 * 1101xx sitekey inválida, 110200 hostname no permitido para la sitekey,
 * 11042x/11043x action o cData inválidos, 1105xx navegador no soportado.
 * https://developers.cloudflare.com/turnstile/troubleshooting/client-side-errors/
 */
const FATAL_ERROR_PREFIXES = ['1101', '110200', '11042', '11043', '1105'];

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
/** Token vigente todavía no entregado. Se vacía al entregarlo (un solo uso). */
let token = '';
/**
 * Último token entregado. Hasta el `reset`, `turnstile.getResponse()` lo sigue
 * devolviendo, y la red de seguridad de `getTurnstileToken` no debe
 * entregarlo por segunda vez: es de un solo uso.
 */
let handedOut = '';
/** Canjes esperando token, en orden de llegada: el próximo token va al primero. */
let waiters: Array<(value: string | undefined) => void> = [];
let scriptPromise: Promise<void> | null = null;
/** api.js no cargó: se reintenta en el próximo canje en vez de esperar 20 s. */
let loadFailed = false;
/** Error de configuración (sitekey, hostname, navegador): no va a llegar ningún token. */
let fatal = false;
/** Último montaje, para poder reintentar la carga desde `getTurnstileToken`. */
let lastMount: { container: HTMLElement; hooks: TurnstileHooks } | null = null;

function resolveWaiters(value: string | undefined): void {
  const pending = waiters;
  waiters = [];
  for (const resolve of pending) resolve(value);
}

/** Llama a la API de Turnstile sin dejar que una excepción suya rompa al que llama. */
function safely(label: string, fn: () => void): void {
  try {
    fn();
  } catch (error) {
    console.warn(`[turnstile] ${label}:`, error instanceof Error ? error.message : error);
  }
}

/**
 * Inyecta api.js una sola vez y resuelve cuando `window.turnstile` existe.
 * No usa `turnstile.ready()`: con un script insertado dinámicamente alcanza
 * con `onload`, y Turnstile se queja si `ready()` se usa con scripts async.
 */
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
    const onLoad = () => {
      window.clearTimeout(timer);
      if (window.turnstile) resolve();
      else reject(new Error('api.js cargó pero window.turnstile no existe'));
    };
    const onError = () => {
      window.clearTimeout(timer);
      reject(new Error('No se pudo cargar Turnstile'));
    };

    // Un tag que falló se saca del DOM: ya no va a disparar nada y, si queda,
    // el próximo reintento lo encontraría como «existente» y esperaría en vano.
    const attach = (script: HTMLScriptElement) => {
      script.addEventListener('load', onLoad, { once: true });
      script.addEventListener(
        'error',
        () => {
          script.remove();
          onError();
        },
        { once: true },
      );
    };

    // Si ya hay un api.js en la página (otro montaje, HMR), se espera a ése en
    // vez de inyectar un segundo: Turnstile avisa si se carga dos veces.
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src^="https://challenges.cloudflare.com/turnstile/v0/api.js"]',
    );
    if (existing) {
      attach(existing);
      return;
    }

    const el = document.createElement('script');
    el.src = SCRIPT_URL;
    el.async = true;
    attach(el);
    document.head.appendChild(el);
  });
  return scriptPromise;
}

/**
 * Renderiza el widget UNA vez dentro de `container`. Idempotente: con un widget
 * ya montado no hace nada. Nunca lanza: si Cloudflare no carga queda en la
 * consola, `loadFailed` se prende y el próximo canje reintenta la carga.
 */
export function mountTurnstile(container: HTMLElement, hooks: TurnstileHooks = {}): void {
  if (!isTurnstileEnabled() || widgetId !== null) return;
  lastMount = { container, hooks };

  void loadScript()
    .then(() => {
      // Pudo montarse dos veces mientras cargaba el script (StrictMode) o
      // desmontarse: renderiza el primer `.then` que llegue con el nodo vivo.
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
          // Un solo uso: va al canje que esperaba primero; si nadie espera,
          // queda guardado para el próximo.
          const next = waiters.shift();
          if (next) {
            handedOut = value;
            next(value);
          } else {
            token = value;
          }
        },
        'expired-callback': () => {
          // Turnstile lo renueva solo; el próximo `callback` trae el nuevo.
          token = '';
        },
        'timeout-callback': () => {
          // Si el desafío interactivo venció sin click, el host vuelve a
          // esconderse: Turnstile no siempre dispara after-interactive acá.
          hooks.onInteractiveEnd?.();
          resetTurnstile();
        },
        'error-callback': (code: string) => {
          token = '';
          const text = code ? String(code) : '';
          if (FATAL_ERROR_PREFIXES.some((p) => text.startsWith(p))) {
            fatal = true;
            console.error(
              `[turnstile] error ${text}: no va a llegar ningún token.` +
                (text.startsWith('110200')
                  ? ' Falta este hostname en la lista del widget (panel de Cloudflare).'
                  : ''),
            );
            hooks.onInteractiveEnd?.();
            resolveWaiters(undefined);
            return;
          }
          // Errores transitorios: Turnstile reintenta solo (`retry: 'auto'`).
          console.warn('[turnstile] error', text);
        },
        'before-interactive-callback': () => hooks.onInteractiveStart?.(),
        'after-interactive-callback': () => hooks.onInteractiveEnd?.(),
      });

      if (!id) {
        console.error('[turnstile] render no devolvió widgetId');
        return;
      }
      widgetId = id;
      loadFailed = false;
    })
    .catch((error: unknown) => {
      // Se descarta la promesa fallida para poder reintentar la carga después.
      scriptPromise = null;
      loadFailed = true;
      console.error('[turnstile]', error instanceof Error ? error.message : error);
      resolveWaiters(undefined);
    });
}

/** Quita el widget y descarta el token y las esperas pendientes. */
export function unmountTurnstile(): void {
  if (widgetId !== null) {
    const id = widgetId;
    safely('remove', () => window.turnstile?.remove(id));
  }
  widgetId = null;
  token = '';
  handedOut = '';
  lastMount = null;
  resolveWaiters(undefined);
}

/**
 * Entrega el token vigente (y lo consume), o espera hasta TOKEN_WAIT_MS a que
 * el desafío en segundo plano lo produzca. `undefined` si Turnstile está
 * apagado, si no llegó a tiempo, o enseguida si ya se sabe que no va a llegar.
 * Nunca lanza.
 */
export function getTurnstileToken(): Promise<string | undefined> {
  if (!isTurnstileEnabled()) return Promise.resolve(undefined);

  // Red de seguridad: en una pestaña en segundo plano el `callback` puede
  // haberse perdido; Turnstile igual guarda la respuesta del widget.
  if (!token && widgetId !== null) {
    const id = widgetId;
    safely('getResponse', () => {
      const live = window.turnstile?.getResponse(id);
      if (live && live !== handedOut && !window.turnstile?.isExpired(id)) token = live;
    });
  }

  if (token) {
    handedOut = token;
    token = '';
    return Promise.resolve(handedOut);
  }

  if (fatal) return Promise.resolve(undefined);

  if (loadFailed) {
    // Sin api.js no hay nada que esperar: se responde ya y se reintenta la
    // carga para el próximo intento (si el script apareció tarde, `loadScript`
    // resuelve al instante y el widget queda montado).
    loadFailed = false;
    if (lastMount && lastMount.container.isConnected) {
      mountTurnstile(lastMount.container, lastMount.hooks);
    }
    return Promise.resolve(undefined);
  }

  // Después de un canje exitoso el widget sigue sosteniendo el token ya usado
  // y no va a producir otro por sí solo. El desafío nuevo se pide recién acá,
  // y no en la pantalla de resultado, para que el checkbox nunca aparezca
  // donde no hay nada que enviar.
  if (handedOut && widgetId !== null) resetTurnstile();

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

/**
 * Borra el token y arranca un desafío nuevo: los tokens son de un solo uso.
 * Un canje que siga esperando recibe el token del desafío nuevo.
 */
export function resetTurnstile(): void {
  token = '';
  // Tras el reset el widget ya no devuelve el token viejo: la red de seguridad
  // de `getTurnstileToken` puede volver a confiar en `getResponse`.
  handedOut = '';
  if (widgetId !== null) {
    const id = widgetId;
    safely('reset', () => window.turnstile?.reset(id));
  }
}
