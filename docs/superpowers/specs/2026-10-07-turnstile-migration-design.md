# Migración de reCAPTCHA v3 a Cloudflare Turnstile — diseño

**Fecha:** 2026-10-07
**Alcance:** `src/services/turnstile.ts` (nuevo, reemplaza `src/services/recaptcha.ts`),
`src/components/security/TurnstileHost.tsx` + `turnstile-host.css` (nuevos),
`src/types/turnstile.d.ts` (nuevo), `src/App.tsx`, `src/app/useCodeFlow.ts`,
`src/services/httpPromoApi.ts`, `src/types/promo.ts`, `src/styles/global.css`,
`.env.example`, `.env` (local), `.github/workflows/deploy.yml`, `Dockerfile`,
`deploy/security-headers.conf`, `README.md`, `docs/README.md`, `docs/GUIA-BACKEND.md`,
`docs/LOGICA-BACKEND.md`, `docs/SEGURIDAD-SERVIDOR.md`.

## Objetivo

Reemplazar el token de reCAPTCHA v3 por uno de **Cloudflare Turnstile** en el canje,
sin tocar ninguna pantalla ni la composición de las pantallas (que se miden contra el
Figma con `figma:check`).

El backend (`codigos-secretos-backend`, spec
`docs/superpowers/specs/2026-10-07-turnstile-v2-design.md`) se despliega **antes** y
ofrece una ruta nueva, `POST /api/v2/codes/redeem`, que recibe `turnstileToken`. La V1
con `recaptchaToken` sigue viva hasta que este frontend esté publicado; después se
borra en el backend.

Referencia: la misma migración ya se hizo en `promo-codigo/client` (componente Lit en
shadow DOM). Acá es más simple porque React renderiza en el DOM normal, pero el manejo
del token (un solo uso, reset tras cada intento fallido, y perezoso tras un resultado, espera acotada) se copia de ahí.

## Decisiones

- **Un solo widget, a nivel app, en una esquina fija.** Turnstile, a diferencia de
  reCAPTCHA v3, a veces necesita que la persona haga click en un checkbox. Las dos
  pantallas que canjean (`/participar` y `/registro`) tienen el formulario sobre un
  pergamino con medidas exactas del Figma: un widget que aparece dentro del formulario
  corre el botón y rompe el layout. Por eso el widget vive en un contenedor **fijo
  abajo a la derecha** (donde estaba la insignia de reCAPTCHA), montado una sola vez
  en `App.tsx`, invisible salvo que Cloudflare pida interacción. Sobrevive al cambio
  de ruta Participar → Registro → resultado.
- **El backend es estricto.** Sin token o con token inválido, la V2 responde `403`.
  El frontend, en vez de «mandar sin token y que decida el servidor» (la filosofía de
  reCAPTCHA), **espera el token hasta 20 s** y, si no llega, muestra un mensaje propio
  sin hacer el POST.
- **El token se pide desde el arranque** (`execution: 'render'`): el desafío corre en
  segundo plano apenas carga la página, así que cuando la persona toca «Participar» el
  token casi siempre ya está. Vive 5 minutos y Turnstile lo renueva solo al vencer.
- **Sin sitekey, Turnstile apagado.** Igual que hoy con reCAPTCHA: con
  `VITE_TURNSTILE_SITE_KEY` vacía no se carga nada de Cloudflare, no se monta ningún
  widget y el canje viaja sin token. Así la demo de GitHub Pages con el adapter mock
  sigue funcionando sin backend. Contra el backend real eso da `403` siempre; por eso
  el build **falla** si hay `VITE_API_URL` pero no hay sitekey (ver *Build y deploy*).

## Servicio — `src/services/turnstile.ts`

Módulo singleton (estado a nivel módulo, como `recaptcha.ts` hoy). Reemplaza a
`recaptcha.ts`, que se borra.

```ts
const SITE_KEY = (import.meta.env.VITE_TURNSTILE_SITE_KEY ?? '').trim();
const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
/** La misma acción que el backend compara en Siteverify. */
const ACTION = 'redeem_code';
const TOKEN_WAIT_MS = 20_000;
const SCRIPT_WAIT_MS = 60_000;

export function isTurnstileEnabled(): boolean;

export interface TurnstileHooks {
  /** Cloudflare va a mostrar el checkbox: el host se hace visible. */
  onInteractiveStart?: () => void;
  onInteractiveEnd?: () => void;
}

/** Renderiza el widget UNA vez dentro de `container`. Idempotente. */
export function mountTurnstile(container: HTMLElement, hooks?: TurnstileHooks): void;
/** Quita el widget y descarta token y esperas pendientes. */
export function unmountTurnstile(): void;
/** Token vigente, o espera hasta TOKEN_WAIT_MS. `undefined` si no hay o está apagado. Nunca lanza. */
export function getTurnstileToken(): Promise<string | undefined>;
/** Borra el token y arranca un desafío nuevo. Los tokens son de un solo uso. */
export function resetTurnstile(): void;
```

Comportamiento:

- **Script.** Se inyecta `SCRIPT_URL` una sola vez (si `window.turnstile` ya existe o
  ya hay un `<script>` con esa URL, no se agrega otro). Una promesa única resuelve en
  `onload` + `turnstile.ready()`; rechaza en `onerror`. Si a los `SCRIPT_WAIT_MS` no
  apareció `window.turnstile`, se da por fallido: `getTurnstileToken` devuelve
  `undefined` y se loguea en consola.
- **Render.** `turnstile.render(container, { sitekey, action: ACTION, appearance:
  'interaction-only', execution: 'render', size: 'normal', language: 'es', theme:
  'dark', callback, 'expired-callback', 'timeout-callback', 'error-callback',
  'before-interactive-callback', 'after-interactive-callback' })`. Se guarda el
  `widgetId`. `theme: 'dark'` porque la esquina está sobre el cielo azul oscuro del
  sitio. `size: 'normal'` (300×65) entra en un teléfono de 390 px con los márgenes.
- **Callbacks.** `callback(token)` guarda el token y resuelve a todos los que esperan.
  `expired-callback` borra el token (Turnstile lo renueva solo; el próximo `callback`
  trae el nuevo). `timeout-callback` llama a `resetTurnstile()`. `error-callback`
  loguea el código en consola y borra el token; el `retry: 'auto'` por defecto de
  Turnstile se encarga de reintentar. Los `before/after-interactive-callback` llaman a los hooks
  del host.
- **`getTurnstileToken`.** Apagado → `undefined`. Token guardado → se devuelve ya.
  Si no, se encola una espera con `setTimeout(TOKEN_WAIT_MS)` que resuelve `undefined`.
- **`resetTurnstile`.** Token `''`; si hay `widgetId`, `turnstile.reset(widgetId)`,
  que con `execution: 'render'` arranca un desafío nuevo en segundo plano.
- **`unmountTurnstile`.** `turnstile.remove(widgetId)`, `widgetId = null`, token `''`,
  resuelve `undefined` a las esperas pendientes.

## Host — `src/components/security/TurnstileHost.tsx`

```tsx
export function TurnstileHost() {
  const ref = useRef<HTMLDivElement>(null);
  const [interactive, setInteractive] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!isTurnstileEnabled() || !el) return;
    mountTurnstile(el, {
      onInteractiveStart: () => setInteractive(true),
      onInteractiveEnd: () => setInteractive(false),
    });
    return () => unmountTurnstile();
  }, []);

  if (!isTurnstileEnabled()) return null;
  return (
    <div
      ref={ref}
      className={`turnstile-host${interactive ? ' turnstile-host--interactive' : ''}`}
      aria-live="polite"
    />
  );
}
```

- Se renderiza **una sola vez** en `App.tsx`, dentro de `HashRouter`, al lado de
  `ScenarioSwitcher` (fuera de `Routes`): no se desmonta al navegar.
- `main.tsx` usa `StrictMode`, que en desarrollo monta → desmonta → vuelve a montar
  el efecto. El par `mountTurnstile` / `unmountTurnstile` lo soporta: el segundo
  montaje renderiza un widget nuevo.
- **No lleva `data-figma`**: `figma:check` sólo compara capas marcadas, así que el host
  no aparece en la tabla ni genera desvíos.

`turnstile-host.css` (importado por el componente; no es lazy, así que carga con la
app):

```css
.turnstile-host {
  position: fixed;
  right: max(16px, env(safe-area-inset-right));
  bottom: max(16px, env(safe-area-inset-bottom));
  /* Por encima de todo lo del sitio (máximo actual: 999); por debajo del
     ScenarioSwitcher de desarrollo (9999). */
  z-index: 1000;
  /* Mientras el widget está invisible, el contenedor no debe tragarse ningún tap. */
  pointer-events: none;
}
.turnstile-host * {
  pointer-events: auto;
}
```

La clase `turnstile-host--interactive` queda disponible para resaltar el contenedor
cuando aparece el checkbox; en esta primera versión no agrega estilos.

## Flujo — `src/app/useCodeFlow.ts`

`redeem(cedula, code)` cambia así (lo demás, igual):

```ts
setLoading(true);
setError(null);
try {
  const token = await getTurnstileToken();
  if (isTurnstileEnabled() && !token) {
    setError(TURNSTILE_MESSAGE);   // sin POST: el backend lo rechazaría igual
    return;                        // el finally igual resetea y apaga loading
  }
  const result = await promoApi.submitPromoCode({ cedula, code, turnstileToken: token });
  …                                // navegación por status, sin cambios
} catch (e) {
  setError(e instanceof BotCheckRejectedError ? TURNSTILE_MESSAGE : NAVE_NODRIZA_MESSAGE);
} finally {
  if (!navigatedToResult) resetTurnstile(); // un solo uso: reset sólo si se queda en la pantalla;
                                            // tras un resultado, lo pide el próximo getTurnstileToken
  setLoading(false);
}
```

Constantes del módulo:

- `TURNSTILE_MESSAGE = 'No pasó la verificación de seguridad. Probá de nuevo en un momento.'` (nueva).
- `NAVE_NODRIZA_MESSAGE = 'No pudimos contactar la nave nodriza. Probá de nuevo en un momento.'`: el
  texto que hoy está repetido inline en `redeem` y `submit`, extraído a una constante.

- `submit()` (pantalla Participar) no cambia: consulta `checkParticipant` en
  localStorage y, si no hay registro, navega a `/registro` **sin consumir token**. El
  token obtenido al cargar sigue vigente cuando Registro llama a `redeem`.
- `HttpPromoApi.post` distingue el `403`: lanza `BotCheckRejectedError` (clase
  exportada desde `httpPromoApi.ts`) en vez del `Error` genérico, para que el flujo
  muestre el mensaje de seguridad y no «la nave nodriza». Los demás códigos siguen
  lanzando el genérico.

## Adapter y tipos

- `src/types/promo.ts`: `PromoCode.recaptchaToken?` pasa a `turnstileToken?`, con el
  comentario reescrito (Cloudflare, un solo uso, 5 minutos, el backend lo verifica
  antes de mirar el código y rechaza con 403 si falta).
- `src/services/httpPromoApi.ts`: `submitPromoCode` hace `POST /api/v2/codes/redeem`
  con `turnstileToken` en lugar de `recaptchaToken`. La ruta va en una constante
  `REDEEM_PATH`. El resto del método no cambia.
- `src/services/mockPromoApi.ts`: ya ignora el token; sólo lo afecta el rename del tipo.
- `src/types/turnstile.d.ts`: declaración de `window.turnstile` copiada de
  `promo-codigo/client/src/turnstile.d.ts`. La declaración global de `grecaptcha` se
  va con `recaptcha.ts`.
- `src/styles/global.css`: se borra el bloque `.grecaptcha-badge`.

## Build, deploy y CSP

- `.env.example`: el bloque de reCAPTCHA se reemplaza por `VITE_TURNSTILE_SITE_KEY=`
  con la misma advertencia (sólo la clave pública; el secret vive en el backend).
- `.env` local: `VITE_TURNSTILE_SITE_KEY=1x00000000000000000000AA` (clave de prueba
  de Cloudflare que siempre pasa).
- `.github/workflows/deploy.yml`: `VITE_TURNSTILE_SITE_KEY: ${{ vars.VITE_TURNSTILE_SITE_KEY }}`
  en el paso de build, comentarios actualizados, y un paso previo que **falla** si
  `vars.VITE_API_URL` tiene valor y `vars.VITE_TURNSTILE_SITE_KEY` no: ese build
  publicaría un sitio donde todo canje da 403. Sin ninguna de las dos variables el
  sitio sigue cayendo al mock, como hoy.
- `Dockerfile`: `ARG VITE_TURNSTILE_SITE_KEY` **sin valor por defecto** (la sitekey
  real todavía no existe) y un `RUN` que falla con el mismo criterio que el workflow.
- `deploy/security-headers.conf`: en la CSP, los tres orígenes de reCAPTCHA se
  reemplazan por `https://challenges.cloudflare.com` en `script-src` y `frame-src`, y
  se quitan de `img-src` y `connect-src` (Turnstile no los necesita). El resto de la
  política no cambia.

## Documentación

- `README.md` (línea del índice), `docs/README.md` y `docs/GUIA-BACKEND.md`: «reCAPTCHA»
  → «Turnstile»; el ejemplo de request pasa a `POST /api/v2/codes/redeem` con
  `turnstileToken`.
- `docs/LOGICA-BACKEND.md`: el diagrama de la sección 2 y la sección 5 se reescriben
  para Turnstile: sitekey en el frontend, secret en el backend, token de un solo uso
  que vive 5 minutos, backend estricto (403 sin token), espera de 20 s y mensaje propio
  en el frontend.
- `docs/SEGURIDAD-SERVIDOR.md`: «reCAPTCHA Enterprise» → «Cloudflare Turnstile»; al
  pasar a producción hay que agregar el dominio final a la lista de hostnames del
  widget en el panel de Cloudflare (en vez de en Google) y a CORS del backend.

## Verificación

El repo no tiene test runner y no se agrega ninguna dependencia (regla de
`CLAUDE.md`). Se verifica con:

1. `npm run typecheck` y `npm run build` limpios.
2. Backend local corriendo con el secret de prueba
   `TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA` y, en el frontend,
   `VITE_API_URL=http://localhost:3001`. Luego, cambiando sólo la sitekey local:

| Sitekey de prueba | Qué se espera |
| --- | --- |
| `1x00000000000000000000AA` (siempre pasa) | Al cargar no se ve nada; al participar el POST va a `/api/v2/codes/redeem` con `turnstileToken`; en la pantalla de resultado NO hay tráfico nuevo a Cloudflare (el widget no se resetea ahí); al volver a Participar y canjear de nuevo, sí (reset perezoso). Participar → Registro → canje consume un solo token. |
| `3x00000000000000000000FF` (fuerza interacción) | Aparece el widget abajo a la derecha, clickeable, en escritorio y a 390 px de ancho; tras el click el canje sigue solo. |
| `2x00000000000000000000AB` (siempre bloquea) | A los 20 s aparece el mensaje de seguridad y **no** hay POST. |

3. Con `VITE_TURNSTILE_SITE_KEY` vacía y `VITE_API_URL` vacía: el sitio sigue en el
   mock, sin widget y sin pedidos a Cloudflare.

## Despliegue

1. Crear en Cloudflare un widget Turnstile **Managed** con los hostnames `localhost`,
   `yenifmnm.github.io`, `promos.metis.com.py` y el dominio final. La sitekey va acá;
   el secret, al backend.
2. Verificar que el backend ya esté publicado con la V2 (`POST /api/v2/codes/redeem`
   sin token → `403 missing-token`).
3. Cargar `VITE_TURNSTILE_SITE_KEY` en *Settings → Secrets and variables → Actions →
   Variables* (GitHub Pages) y/o pasarla como `--build-arg` (Docker). Publicar.
4. Instalar el `security-headers.conf` nuevo en el Nginx del dominio publicado.
5. Humo en producción: un canje real; si el navegador muestra el error `110200` de
   Turnstile, falta el hostname en la lista del widget.
6. Avisar al backend para que borre la V1 y reCAPTCHA.

## Fuera de alcance

- Cambios de pantalla, copy o composición. El único elemento nuevo es el host fijo.
- Un test runner para el frontend.
- Un estilo propio para `turnstile-host--interactive` (queda el gancho).
- Borrar la V1 en el backend (se hace allá, después de publicar esto).
