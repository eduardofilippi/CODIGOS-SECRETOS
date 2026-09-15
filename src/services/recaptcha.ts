/**
 * reCAPTCHA v3 — sólo el cableado del token.
 * -------------------------------------------------------------------------
 * PENDIENTE: faltan las claves. Mientras `VITE_RECAPTCHA_SITE_KEY` esté vacía
 * esto no carga nada de Google, no hace ninguna request y devuelve `undefined`.
 * El sitio funciona igual; el día que lleguen las claves se completa el `.env`
 * y empieza a viajar el token, sin tocar ninguna pantalla.
 *
 * Reparto de responsabilidades:
 *
 *   Frontend  genera el token y lo manda junto al código.
 *   Backend   lo verifica contra Google ANTES de mirar el código, con la
 *             clave secreta —que nunca sale del servidor— y recién ahí
 *             resuelve WIN / LOSE / CODE_ALREADY_USED / CODE_NOT_FOUND.
 *
 * El token es de un solo uso y vive dos minutos: se pide en el momento del
 * envío, nunca antes.
 */

/** Clave pública del sitio. Vacía = reCAPTCHA apagado. */
const SITE_KEY: string = import.meta.env.VITE_RECAPTCHA_SITE_KEY ?? '';

/** Nombre de la acción que se reporta a Google, para separar métricas. */
export type RecaptchaAction = 'redeem_code' | 'register';

/**
 * La clave es de reCAPTCHA en Google Cloud (Enterprise), no una clásica:
 * cambia el script (`enterprise.js`) y el namespace (`grecaptcha.enterprise`),
 * pero el token que se obtiene viaja igual que antes.
 */
declare global {
  interface Window {
    grecaptcha?: {
      enterprise?: {
        ready: (cb: () => void) => void;
        execute: (siteKey: string, opts: { action: string }) => Promise<string>;
      };
    };
  }
}

export function isRecaptchaEnabled(): boolean {
  return SITE_KEY.length > 0;
}

let scriptPromise: Promise<void> | null = null;

function loadScript(): Promise<void> {
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<void>((resolve, reject) => {
    const el = document.createElement('script');
    el.src = `https://www.google.com/recaptcha/enterprise.js?render=${encodeURIComponent(SITE_KEY)}`;
    el.async = true;
    el.defer = true;
    el.onload = () => resolve();
    el.onerror = () => reject(new Error('No se pudo cargar reCAPTCHA'));
    document.head.appendChild(el);
  });
  return scriptPromise;
}

/**
 * Token para esta operación, o `undefined` si reCAPTCHA está apagado.
 *
 * Nunca lanza: si Google no responde se devuelve `undefined` y la decisión de
 * aceptar o rechazar queda del lado del backend. Bloquear al usuario porque un
 * script de terceros no cargó sería peor que dejar pasar la request y que el
 * servidor la evalúe.
 */
export async function getRecaptchaToken(
  action: RecaptchaAction,
): Promise<string | undefined> {
  if (!isRecaptchaEnabled()) return undefined;
  try {
    await loadScript();
    const grecaptcha = window.grecaptcha?.enterprise;
    if (!grecaptcha) return undefined;
    await new Promise<void>((resolve) => grecaptcha.ready(resolve));
    return await grecaptcha.execute(SITE_KEY, { action });
  } catch {
    return undefined;
  }
}
