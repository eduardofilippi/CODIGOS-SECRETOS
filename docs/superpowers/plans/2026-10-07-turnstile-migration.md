# Turnstile Migration (frontend) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the reCAPTCHA v3 token in the redeem flow with a Cloudflare Turnstile token sent to `POST /api/v2/codes/redeem`, without touching any screen layout.

**Architecture:** A module-level singleton (`src/services/turnstile.ts`) loads Cloudflare's `api.js` once, renders one widget into a fixed bottom-right host (`TurnstileHost`, mounted once in `App.tsx`) and hands out the current token. `useCodeFlow.redeem` waits up to 20 s for a token, refuses to POST without one, and resets the widget after every attempt because tokens are single-use. `HttpPromoApi` posts to the V2 route and turns a 403 into a typed error so the flow shows a security-specific message.

**Tech Stack:** React 18, Vite 5, TypeScript 5 (strict, `noUnusedLocals`), react-router (HashRouter). No test runner: verification is `npm run typecheck`, `npm run build` and manual runs with Cloudflare's test keys.

**Spec:** `docs/superpowers/specs/2026-10-07-turnstile-migration-design.md`. Read it first.

**Repo conventions:** comments and names in Spanish (see `CLAUDE.md`). No new dependencies. Run commands from `C:\Users\ROG\Documents\EdgeC\CODIGOS-SECRETOS`. Branch: `fixes-15-set`. Do not push (a push to `main` deploys to GitHub Pages).

**Prerequisite for Task 6:** the backend plan (`codigos-secretos-backend/docs/superpowers/plans/2026-10-07-turnstile-v2.md`) must be implemented so `POST /api/v2/codes/redeem` exists locally.

**Baseline before Task 1:** `npm run typecheck` → no output.

---

## File map

| File | Responsibility | Change |
| --- | --- | --- |
| `src/types/turnstile.d.ts` | Ambient types for `window.turnstile` | create |
| `src/services/turnstile.ts` | Script loading, single widget, token hand-out, reset | create |
| `src/services/recaptcha.ts` | Old token wiring | delete (Task 3) |
| `src/components/security/TurnstileHost.tsx` + `turnstile-host.css` | The one fixed container the widget renders into | create |
| `src/App.tsx` | App shell | mount `TurnstileHost` once |
| `src/types/promo.ts` | Frontend/backend contract | `recaptchaToken` → `turnstileToken` |
| `src/services/httpPromoApi.ts` | Real adapter | V2 path, `BotCheckRejectedError` |
| `src/app/useCodeFlow.ts` | Redeem orchestration | wait for token, reset, security message |
| `src/styles/global.css` | Global styles | drop `.grecaptcha-badge` |
| `.env.example`, `.env` | Vite env | `VITE_TURNSTILE_SITE_KEY` |
| `.github/workflows/deploy.yml`, `Dockerfile` | Builds | new var + guard |
| `deploy/security-headers.conf` | nginx CSP | Cloudflare origins |
| `README.md`, `docs/*.md` | Docs | reCAPTCHA → Turnstile, V2 path |

---

### Task 1: Turnstile service and ambient types

**Files:**
- Create: `src/types/turnstile.d.ts`
- Create: `src/services/turnstile.ts`

- [ ] **Step 1: Create `src/types/turnstile.d.ts`**

```ts
/**
 * Tipos mínimos de la API cliente de Cloudflare Turnstile (`window.turnstile`).
 * https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/
 * Copiado de `promo-codigo/client/src/turnstile.d.ts`.
 */
interface TurnstileRenderOptions {
  sitekey: string;
  action?: string;
  cData?: string;
  callback?: (token: string) => void;
  'error-callback'?: (errorCode: string) => boolean | void;
  'expired-callback'?: () => void;
  'timeout-callback'?: () => void;
  'before-interactive-callback'?: () => void;
  'after-interactive-callback'?: () => void;
  'unsupported-callback'?: () => void;
  theme?: 'auto' | 'light' | 'dark';
  language?: string;
  size?: 'normal' | 'flexible' | 'compact';
  appearance?: 'always' | 'execute' | 'interaction-only';
  execution?: 'render' | 'execute';
  retry?: 'auto' | 'never';
  'retry-interval'?: number;
  'refresh-expired'?: 'auto' | 'manual' | 'never';
  'refresh-timeout'?: 'auto' | 'manual' | 'never';
  'response-field'?: boolean;
  'response-field-name'?: string;
  tabindex?: number;
}

interface Turnstile {
  /** Devuelve el id del widget, o undefined si no pudo renderizar. */
  render(container: string | HTMLElement, options: TurnstileRenderOptions): string | undefined;
  reset(widgetId?: string | HTMLElement): void;
  remove(widgetId?: string | HTMLElement): void;
  getResponse(widgetId?: string | HTMLElement): string | undefined;
  isExpired(widgetId?: string | HTMLElement): boolean;
  execute(container?: string | HTMLElement, options?: TurnstileRenderOptions): void;
  ready(callback: () => void): void;
}

declare global {
  interface Window {
    turnstile?: Turnstile;
  }
}

export {};
```

- [ ] **Step 2: Create `src/services/turnstile.ts`**

```ts
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
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: no output. (`recaptcha.ts` still exists and is still imported by `useCodeFlow`; it goes away in Task 3.)

- [ ] **Step 4: Commit**

```bash
git add src/types/turnstile.d.ts src/services/turnstile.ts
git commit -m "feat: servicio de Cloudflare Turnstile (script, widget único, token de un solo uso)

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 2: `TurnstileHost` mounted once in `App.tsx`

**Files:**
- Create: `src/components/security/TurnstileHost.tsx`
- Create: `src/components/security/turnstile-host.css`
- Modify: `src/App.tsx:4` (import) and `src/App.tsx:72` (next to `<ScenarioSwitcher />`)

- [ ] **Step 1: Create `src/components/security/turnstile-host.css`**

```css
/* ---------- Contenedor único del widget de Turnstile ---------- */
/* Fijo abajo a la derecha, donde estaba la insignia de reCAPTCHA. Con
   `appearance: 'interaction-only'` Cloudflare lo deja invisible salvo que
   necesite un click: por eso no tiene fondo ni tamaño propio. */
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

/* `.turnstile-host--interactive` la pone el componente mientras Cloudflare
   muestra el checkbox. Es un gancho para resaltar el contenedor; por ahora no
   tiene estilos propios, así que no se declara. */
```

- [ ] **Step 2: Create `src/components/security/TurnstileHost.tsx`**

```tsx
import { useEffect, useRef, useState } from 'react';
import { isTurnstileEnabled, mountTurnstile, unmountTurnstile } from '../../services/turnstile';
import './turnstile-host.css';

/**
 * Contenedor ÚNICO del widget de Cloudflare Turnstile.
 *
 * Se renderiza una sola vez en `App.tsx`, fuera de `Routes`, así que sobrevive
 * a Participar → Registro → resultado y el desafío que arrancó al cargar la
 * página sigue valiendo cuando la persona termina el formulario.
 *
 * No va dentro de los pergaminos a propósito: si Cloudflare pide un click, el
 * widget aparecería dentro del formulario y correría el botón, rompiendo la
 * composición medida contra el Figma. Acá aparece en la esquina, fijo.
 *
 * Sin `data-figma`: `figma:check` sólo compara capas marcadas.
 *
 * Con `VITE_TURNSTILE_SITE_KEY` vacía no renderiza nada (demo con mock).
 */
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
    // StrictMode (dev) monta → desmonta → monta: el servicio tolera el par.
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

- [ ] **Step 3: Mount it in `src/App.tsx`**

After line 4 (`import { ScenarioSwitcher } …`) add:

```tsx
import { TurnstileHost } from './components/security/TurnstileHost';
```

Replace line 72 (`        <ScenarioSwitcher />`) with:

```tsx
        <ScenarioSwitcher />
        {/* Widget anti-bot, uno solo para toda la app; ver el componente. */}
        <TurnstileHost />
```

- [ ] **Step 4: Typecheck and commit**

Run: `npm run typecheck`
Expected: no output.

```bash
git add src/components/security/TurnstileHost.tsx src/components/security/turnstile-host.css src/App.tsx
git commit -m "feat: TurnstileHost fijo abajo a la derecha, montado una vez en App

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 3: Wire the redeem flow to Turnstile and the V2 route

These edits must land together: renaming the token field touches the type, the adapter and the hook at once.

**Files:**
- Modify: `src/types/promo.ts:27-39`
- Modify: `src/services/httpPromoApi.ts:30-36`, `:38-59`, `:86-100`
- Modify: `src/app/useCodeFlow.ts` (imports, constants, `redeem`, `submit`)
- Delete: `src/services/recaptcha.ts`
- Modify: `src/styles/global.css:72-80`

- [ ] **Step 1: `src/types/promo.ts` — rename the token field**

Replace the `PromoCode` interface (lines 27-39) with:

```ts
export interface PromoCode {
  cedula: Cedula;
  code: string;
  /**
   * Token de Cloudflare Turnstile obtenido antes del envío.
   *
   * Va vacío mientras no haya sitekey cargada (`VITE_TURNSTILE_SITE_KEY`). El
   * backend lo verifica contra Cloudflare ANTES de mirar el código y, si falta
   * o no es válido, rechaza con 403 sin consumir el código. Es de un solo uso
   * y vive 5 minutos: después de cada canje el widget se resetea.
   */
  turnstileToken?: string;
}
```

- [ ] **Step 2: `src/services/httpPromoApi.ts` — V2 path and typed 403**

Right after the imports (after the `participantStorage` import block, before the class doc comment), add:

```ts
/**
 * El backend rechazó la verificación anti-bot (403): el token faltó, venció o
 * ya se usó. `useCodeFlow` lo distingue para mostrar el mensaje de seguridad
 * en vez del genérico.
 */
export class BotCheckRejectedError extends Error {
  constructor(path: string) {
    super(`API ${path} rechazó la verificación de seguridad (403)`);
    this.name = 'BotCheckRejectedError';
  }
}

/** Canje con token de Turnstile. La V1 (`/api/codes/redeem`) usaba reCAPTCHA. */
const REDEEM_PATH = '/api/v2/codes/redeem';
```

In the class doc comment change the line

```
 *   submitPromoCode     POST /api/codes/redeem con los datos guardados
```

to

```
 *   submitPromoCode     POST /api/v2/codes/redeem con los datos guardados
```

Replace the body of `private async post<T>` from `if (!response.ok) {` through its closing `}` with:

```ts
    if (response.status === 403) {
      // Verificación anti-bot rechazada: mensaje propio en useCodeFlow.
      throw new BotCheckRejectedError(path);
    }
    if (!response.ok) {
      throw new Error(`API ${path} respondió ${response.status}`);
    }
```

Replace the signature and the POST of `submitPromoCode`:

```ts
  async submitPromoCode({ cedula, code, turnstileToken }: PromoCode): Promise<PromoCodeResult> {
```

and

```ts
    const result = await this.post<PromoCodeResult>(REDEEM_PATH, {
      cedula: form.cedula,
      code,
      turnstileToken,
      nombre: form.fullName,
      telefono: form.phone,
      email: form.email,
      dob: form.birthDate,
      localidad: form.city,
    });
```

- [ ] **Step 3: `src/app/useCodeFlow.ts` — wait, refuse, reset**

Replace the import on line 4

```ts
import { getRecaptchaToken } from '../services/recaptcha';
```

with

```ts
import { getTurnstileToken, isTurnstileEnabled, resetTurnstile } from '../services/turnstile';
import { BotCheckRejectedError } from '../services/httpPromoApi';
```

After the `ESTADO_DESCONOCIDO_MESSAGE` constant add:

```ts
/** Fallo de red o del servidor: el mismo texto para `submit` y `redeem`. */
const NAVE_NODRIZA_MESSAGE = 'No pudimos contactar la nave nodriza. Probá de nuevo en un momento.';

/**
 * No hay token de Turnstile (no llegó en 20 s) o el backend lo rechazó. Se
 * pide reintentar: el widget ya se reseteó y está generando uno nuevo.
 */
const TURNSTILE_MESSAGE =
  'No pudimos completar la verificación de seguridad. Esperá un momento y volvé a intentar.';
```

In `redeem`, replace the two lines

```ts
        // Se pide recién acá: el token dura dos minutos y es de un solo uso.
        const recaptchaToken = await getRecaptchaToken('redeem_code');
        const result = await promoApi.submitPromoCode({ cedula, code, recaptchaToken });
```

with

```ts
        /* El desafío corre en segundo plano desde que cargó la página, así que
           el token casi siempre ya está. Si no llegó en 20 s NO se manda el
           canje: el backend lo rechazaría con 403 igual. El `finally` resetea
           el widget también en este camino. */
        const turnstileToken = await getTurnstileToken();
        if (isTurnstileEnabled() && !turnstileToken) {
          setError(TURNSTILE_MESSAGE);
          return;
        }
        const result = await promoApi.submitPromoCode({ cedula, code, turnstileToken });
```

Replace the `catch`/`finally` of `redeem`

```ts
      } catch {
        setError('No pudimos contactar la nave nodriza. Probá de nuevo en un momento.');
      } finally {
        setLoading(false);
      }
```

with

```ts
      } catch (e) {
        setError(e instanceof BotCheckRejectedError ? TURNSTILE_MESSAGE : NAVE_NODRIZA_MESSAGE);
      } finally {
        // El token es de un solo uso: salga como salga, el próximo intento
        // lleva uno nuevo.
        resetTurnstile();
        setLoading(false);
      }
```

In `submit`, replace

```ts
        setError('No pudimos contactar la nave nodriza. Probá de nuevo en un momento.');
```

with

```ts
        setError(NAVE_NODRIZA_MESSAGE);
```

- [ ] **Step 4: Delete the old service and the badge rule**

```bash
git rm src/services/recaptcha.ts
```

In `src/styles/global.css` delete the block from the comment `/* ---------- reCAPTCHA (formularios de Participar y Registro) ---------- */` through the closing `}` of `.grecaptcha-badge` (lines 72-80), leaving one blank line before `.sr-only`.

- [ ] **Step 5: Typecheck and build**

Run: `npm run typecheck && npm run build`
Expected: typecheck silent; `vite build` ends with `✓ built in …`. `grep -ri recaptcha src` prints nothing.

- [ ] **Step 6: Commit**

```bash
git add src/types/promo.ts src/services/httpPromoApi.ts src/app/useCodeFlow.ts src/styles/global.css
git commit -m "feat: el canje viaja con turnstileToken a POST /api/v2/codes/redeem

Sin token en 20 s no se manda; tras cada intento el widget se resetea. El
403 del backend muestra el mensaje de seguridad en vez del genérico.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 4: Env, CI, Docker and CSP

**Files:**
- Modify: `.env.example:13-28`
- Modify: `.env` (local, git-ignored)
- Modify: `.github/workflows/deploy.yml:48-71`
- Modify: `Dockerfile:11-21`
- Modify: `deploy/security-headers.conf:5`

- [ ] **Step 1: `.env.example`**

Replace the reCAPTCHA section (from its `# ----` opener on line 13 through `VITE_RECAPTCHA_SITE_KEY=`) with:

```
# ---------------------------------------------------------------------------
# Cloudflare Turnstile
# ---------------------------------------------------------------------------
# Sólo la clave del SITIO va acá: es pública y viaja al navegador.
# La clave SECRETA nunca se pone en este archivo ni en ninguna variable VITE_:
# todo lo que empieza con VITE_ termina dentro del JavaScript publicado y
# cualquiera puede leerlo. La secreta vive únicamente en el backend, que es
# quien verifica el token contra Cloudflare.
#
# Mientras esté vacía, el sitio no carga nada de Cloudflare y manda el canje sin
# token: sirve para la demo con el adapter mock. Contra el backend real NO
# alcanza: POST /api/v2/codes/redeem rechaza con 403 todo canje sin token.
#
# Para desarrollo local, la sitekey de prueba de Cloudflare que siempre pasa:
#   VITE_TURNSTILE_SITE_KEY=1x00000000000000000000AA
# Otras de prueba: 3x00000000000000000000FF fuerza el checkbox;
# 2x00000000000000000000AB bloquea siempre.
VITE_TURNSTILE_SITE_KEY=
```

- [ ] **Step 2: Local `.env`**

Replace the comment lines about reCAPTCHA and the `VITE_RECAPTCHA_SITE_KEY=…` line with:

```
# Sitekey de PRUEBA de Cloudflare Turnstile (siempre pasa). El backend local
# corre con el secret de prueba 1x0000000000000000000000000000000AA.
VITE_TURNSTILE_SITE_KEY=1x00000000000000000000AA
```

- [ ] **Step 3: `.github/workflows/deploy.yml`**

In the long comment above `- run: npm run build`, replace

```
      #   VITE_API_URL=https://promo.edge.com.py/purosol
      #   VITE_RECAPTCHA_SITE_KEY=6LfcYIQtAAAAAAqpWHzZ6y-cTCPOPEBXIu8XJWOD
```

with

```
      #   VITE_API_URL=https://promo.edge.com.py/purosol
      #   VITE_TURNSTILE_SITE_KEY=<sitekey del widget de Cloudflare>
```

and these three comment lines

```
      # el bundle, así que sólo pueden contener valores PÚBLICOS. La URL del
      # backend y la clave de sitio de reCAPTCHA lo son. Nunca poner acá la
      # clave secreta de reCAPTCHA ni credenciales de Avimovil.
```

with

```
      # el bundle, así que sólo pueden contener valores PÚBLICOS. La URL del
      # backend y la sitekey de Turnstile lo son. Nunca poner acá el secret de
      # Turnstile ni credenciales de Avimovil.
```

Insert this step right before `- run: npm run build`:

```yaml
      # Con backend real y sin sitekey de Turnstile, el sitio publicado daría
      # 403 en todos los canjes: el backend (V2) no acepta canjes sin token.
      # Mejor que el build falle acá. Sin NINGUNA de las dos variables el sitio
      # cae al mock, como siempre.
      - name: Turnstile sitekey obligatoria si hay backend
        if: ${{ vars.VITE_API_URL != '' && vars.VITE_TURNSTILE_SITE_KEY == '' }}
        run: |
          echo "::error::VITE_API_URL está cargada pero VITE_TURNSTILE_SITE_KEY no. Cargala en Settings → Secrets and variables → Actions → Variables."
          exit 1

```

Replace the `env:` of the build step:

```yaml
        env:
          VITE_API_URL: ${{ vars.VITE_API_URL }}
          VITE_TURNSTILE_SITE_KEY: ${{ vars.VITE_TURNSTILE_SITE_KEY }}
```

- [ ] **Step 4: `Dockerfile`**

Replace lines 11-21 (the `# Variables de Vite…` comment through the `ENV` pair) with:

```dockerfile
# Variables de Vite. OJO: se INLINEAN en tiempo de build, no son de runtime;
# cambiarlas obliga a reconstruir la imagen. Se sobreescriben al construir:
#   docker build \
#     --build-arg VITE_API_URL=https://mi-backend \
#     --build-arg VITE_TURNSTILE_SITE_KEY=0x4AAA... .
# La sitekey es pública (viaja al navegador) pero NO tiene default: la real se
# pasa al construir.
ARG VITE_API_URL=https://promo.edge.com.py/purosol
ARG VITE_TURNSTILE_SITE_KEY
ENV VITE_API_URL=$VITE_API_URL \
    VITE_TURNSTILE_SITE_KEY=$VITE_TURNSTILE_SITE_KEY

# Con backend real y sin sitekey, todo canje daría 403 (el backend V2 exige
# token): mejor fallar acá que publicar eso.
RUN if [ -n "$VITE_API_URL" ] && [ -z "$VITE_TURNSTILE_SITE_KEY" ]; then \
      echo "VITE_API_URL está cargada pero VITE_TURNSTILE_SITE_KEY no: pasala con --build-arg." >&2; \
      exit 1; \
    fi
```

- [ ] **Step 5: `deploy/security-headers.conf`**

Replace the comment and the CSP line (lines 1-5) with:

```nginx
# Cabeceras de seguridad para el Nginx que publica el micrositio.
#
# La CSP permite solamente los recursos propios, el backend publicado y
# Cloudflare Turnstile (script y frame). No modifica HTML ni CSS.
add_header Content-Security-Policy "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self' https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' https://promo.edge.com.py; frame-src https://challenges.cloudflare.com; worker-src 'self' blob:; manifest-src 'self'; upgrade-insecure-requests" always;
```

- [ ] **Step 6: Verify and commit**

Run: `grep -rn -i recaptcha .env.example .github Dockerfile deploy` → no output.
Run: `npm run build` → `✓ built in …` (the local `.env` now has the dummy sitekey).

```bash
git add .env.example .github/workflows/deploy.yml Dockerfile deploy/security-headers.conf
git commit -m "build: VITE_TURNSTILE_SITE_KEY en CI y Docker (obligatoria con backend), CSP para Cloudflare

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 5: Docs

**Files:**
- Modify: `README.md:12`
- Modify: `docs/README.md:8`
- Modify: `docs/GUIA-BACKEND.md:12`, `:197-206`
- Modify: `docs/LOGICA-BACKEND.md:32-39`, `:319-336`
- Modify: `docs/SEGURIDAD-SERVIDOR.md:9`, `:43`, `:55`

- [ ] **Step 1: One-word swaps**

- `README.md` line 12: `el flujo con reCAPTCHA` → `el flujo con Turnstile`.
- `docs/README.md` line 8: `el flujo con reCAPTCHA` → `el flujo con Turnstile`.
- `docs/GUIA-BACKEND.md` line 12: `reCAPTCHA y lo que falta` → `Turnstile y lo que falta`.
- `docs/SEGURIDAD-SERVIDOR.md` line 9: `reCAPTCHA Enterprise` → `Cloudflare Turnstile`; line 43: `comprobar reCAPTCHA y backend` → `comprobar Turnstile y backend`; line 55: `dominio final en reCAPTCHA Enterprise y en la lista CORS del backend` → `dominio final en la lista de hostnames del widget de Turnstile (panel de Cloudflare) y en la lista CORS del backend`.

- [ ] **Step 2: `docs/GUIA-BACKEND.md` request example (lines 197-206)**

Replace

````
```
POST /api/codes/redeem
```

**Body**

```json
{ "cedula": "1234567", "code": "ABCDG847FR5", "recaptchaToken": "03AFcW..." }
```

`recaptchaToken` viaja vacío mientras no haya claves cargadas. **Se verifica contra Google ANTES de mirar el código**: si no es válido, se rechaza sin consumir nada. Detalle en [`LOGICA-BACKEND.md`](LOGICA-BACKEND.md#5-recaptcha).
````

with

````
```
POST /api/v2/codes/redeem
```

**Body**

```json
{ "cedula": "1234567", "code": "ABCDG847FR5", "turnstileToken": "0.AbCd..." }
```

`turnstileToken` lo genera Cloudflare Turnstile en el navegador. **Se verifica contra Cloudflare ANTES de mirar el código**: si falta o no es válido, el backend responde `403` sin consumir nada. Detalle en [`LOGICA-BACKEND.md`](LOGICA-BACKEND.md#5-turnstile).
````

- [ ] **Step 3: `docs/LOGICA-BACKEND.md` section 2 diagram (lines 32-39)**

Replace

```
  ↓  genera token de reCAPTCHA (acción "redeem_code")
POST /api/codes/redeem
  { "cedula": "1234567", "code": "XXXXXXX", "recaptchaToken": "..." }
  ↓
BACKEND
  │
  ├─ 1. Verifica el token con Google (clave SECRETA, sólo del servidor)
  │     ¿válido y score confiable?
```

with

```
  ↓  toma el token de Turnstile (acción "redeem_code"; el desafío corre desde que cargó la página)
POST /api/v2/codes/redeem
  { "cedula": "1234567", "code": "XXXXXXX", "turnstileToken": "..." }
  ↓
BACKEND
  │
  ├─ 1. Verifica el token con Cloudflare (clave SECRETA, sólo del servidor)
  │     ¿válido?
```

- [ ] **Step 4: `docs/LOGICA-BACKEND.md` section 5 (lines 319-336)**

Replace the whole `## 5. reCAPTCHA` section (heading through the paragraph ending `la decisión final es del servidor.`) with:

```markdown
## 5. Turnstile

El canje viaja con un token de **Cloudflare Turnstile** (reemplazó a reCAPTCHA v3
en octubre de 2026). El cableado del frontend está en
[`src/services/turnstile.ts`](../src/services/turnstile.ts) y el widget vive en
[`src/components/security/TurnstileHost.tsx`](../src/components/security/TurnstileHost.tsx):
un contenedor fijo abajo a la derecha, invisible salvo que Cloudflare pida un click.

| Dónde | Qué |
| --- | --- |
| Frontend | `VITE_TURNSTILE_SITE_KEY` — clave **del sitio**, pública, viaja al navegador |
| Backend | `TURNSTILE_SECRET_KEY` — clave **secreta**, nunca sale del servidor, nunca en una variable `VITE_` |

Con la variable vacía el sitio no carga nada de Cloudflare y manda el canje sin
`turnstileToken` (sirve para la demo con el adapter mock). **Contra el backend
real eso no alcanza**: `POST /api/v2/codes/redeem` rechaza con `403` todo canje
sin token o con token inválido, sin consumir el código.

El token es de un solo uso y vive 5 minutos; el desafío corre en segundo plano
desde que carga la página, así que al tocar «Participar» casi siempre ya está.
El frontend espera hasta 20 s a que llegue; si no llega, muestra «No pudimos
completar la verificación de seguridad…» y **no** manda el canje. Después de
cada canje el widget se resetea para que el próximo intento lleve un token nuevo.
```

- [ ] **Step 5: Verify and commit**

Run: `grep -rn -i recaptcha README.md docs/*.md` → no output.

```bash
git add README.md docs/README.md docs/GUIA-BACKEND.md docs/LOGICA-BACKEND.md docs/SEGURIDAD-SERVIDOR.md
git commit -m "docs: reCAPTCHA → Cloudflare Turnstile y canje por POST /api/v2/codes/redeem

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 6: Manual verification with Cloudflare's test keys

No code changes. Requires the backend from the backend plan.

- [ ] **Step 1: Start the backend with the always-pass secret**

In `C:\Users\ROG\Documents\EdgeC\codigos-secretos-backend`, make sure `.env` has `CORS_ORIGIN` including `http://localhost:5180` and `TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA`, then `npm run dev`. Expected: banner with `Canje V2 (Turnstile)`.

- [ ] **Step 2: Start the frontend**

`.env` must have `VITE_API_URL=http://localhost:3001` and `VITE_TURNSTILE_SITE_KEY=1x00000000000000000000AA`. Run `npm run dev` and open `http://localhost:5180/`.

- [ ] **Step 3: Happy path (always-pass sitekey)**

1. DevTools → Network. On load there is a request to `challenges.cloudflare.com/turnstile/v0/api.js` and **none** to `google.com`. Nothing visible bottom-right.
2. Go to *Cargá acá tu código*, type cédula `1234567` and code `ABCD1234`, submit. With no stored registration you land on `/registro`; no POST to the backend yet.
3. Fill the form (birth date `1990-05-14`) and submit. Expected: one `POST http://localhost:3001/api/v2/codes/redeem` whose JSON body has `turnstileToken` set (a non-empty string). The backend log prints `Turnstile OK`. The flow continues to the result screen (or the 502 message if `AVIMOVIL_SECRET` is empty, which is fine for this check).
4. Right after the redeem, Network shows fresh requests to `challenges.cloudflare.com` without any page reload: that is the widget resetting and starting the next challenge.

- [ ] **Step 4: Forced interaction (`3x00000000000000000000FF`)**

Change `VITE_TURNSTILE_SITE_KEY` in `.env` to `3x00000000000000000000FF`, restart `npm run dev`.

Expected: a Turnstile box appears bottom-right over the space background on desktop and at 390 px width (DevTools device toolbar). It is clickable; the rest of the page still responds to clicks. After solving it, a redeem goes through as in Step 3.

- [ ] **Step 5: Always blocked (`2x00000000000000000000AB`)**

Change the sitekey to `2x00000000000000000000AB`, restart.

Expected: console shows `[turnstile] error …`. Submitting a redeem from `/registro` shows, after about 20 s, `No pudimos completar la verificación de seguridad. Esperá un momento y volvé a intentar.` and **no** POST to the backend appears in Network.

- [ ] **Step 6: Mock mode untouched**

Set both `VITE_API_URL=` and `VITE_TURNSTILE_SITE_KEY=` empty, restart.

Expected: no request to Cloudflare, no host div in the DOM (`document.querySelector('.turnstile-host')` is `null`), the scenario switcher still drives the four result screens.

- [ ] **Step 7: Restore the local `.env`**

Put back `VITE_API_URL=http://localhost:3001` and `VITE_TURNSTILE_SITE_KEY=1x00000000000000000000AA`. Nothing to commit.

---

## Deployment notes (for whoever ships this)

1. The backend must already be live with `POST /api/v2/codes/redeem` (check: POST without token → `403 missing-token`).
2. Create the Turnstile widget (Managed) in Cloudflare with hostnames `localhost`, `yenifmnm.github.io`, `promos.metis.com.py` and the final domain. The sitekey goes to GitHub → Settings → Secrets and variables → Actions → Variables as `VITE_TURNSTILE_SITE_KEY`, and to the Docker build as `--build-arg VITE_TURNSTILE_SITE_KEY=…`.
3. Install the new `deploy/security-headers.conf` on the nginx that serves the site (see `docs/SEGURIDAD-SERVIDOR.md`).
4. Smoke in production: one real redeem. Browser error `110200` from Turnstile means the hostname is missing from the widget's list.
5. Tell the backend owner the front is on V2 so V1 and reCAPTCHA can be deleted.
