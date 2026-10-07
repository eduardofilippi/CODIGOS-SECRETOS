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
