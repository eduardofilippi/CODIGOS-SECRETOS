/**
 * Contratos de dominio de la promo.
 * -------------------------------------------------------------------------
 * ESTE ARCHIVO ES LA FRONTERA CON EL BACKEND.
 * El equipo de backend implementa `PromoApi` (ver services/promoApi.ts) contra
 * estos tipos. Las pantallas NUNCA deciden reglas de negocio: sólo consumen
 * `PromoCodeResult` y renderizan.
 */

export type Cedula = string;

export interface Participant {
  cedula: Cedula;
  fullName: string;
  city?: string;
}

export interface RegistrationForm {
  fullName: string;
  birthDate: string; // ISO yyyy-mm-dd
  cedula: Cedula;
  email: string;
  city: string;
  phone: string;
}

export interface PromoCode {
  cedula: Cedula;
  code: string;
  /**
   * Token de reCAPTCHA v3 generado en el momento del envío.
   *
   * Va vacío mientras no haya claves cargadas (`VITE_RECAPTCHA_SITE_KEY`). El
   * backend lo verifica contra Google ANTES de mirar el código: si el token no
   * es válido o el score es bajo, rechaza la operación y no consume el código.
   * Es de un solo uso y caduca a los dos minutos.
   */
  recaptchaToken?: string;
}

export interface Prize {
  id: string;
  /**
   * Id numérico del premio en Avimovil (0–19). Es la clave con la que el
   * backend identifica el premio ganado (`premio-<id>-<nombre>`); el adapter la
   * usa para cruzar la respuesta con este catálogo y resolver imagen y copy.
   */
  avimovilId?: number;
  /** Nombre comercial visible. Nunca códigos internos ni specs de depósito. */
  name: string;
  /** URL del asset ya resuelto por el adapter. */
  image: string;
  /**
   * Versión reducida de `image` para la tira de miniaturas de mobile. Es
   * opcional: si falta, la tira cae en `image`. Existe porque el catálogo real
   * son 19 premios y decodificar 19 imágenes grandes a la vez castiga al
   * teléfono.
   */
  thumb?: string;
  /** Copy corto opcional para el carrusel. */
  caption?: string;
  /**
   * Artículo que precede al nombre en "te ganaste ___ {name}!".
   * Va con el premio porque depende de su género y número —"una Bicicleta",
   * "un Skate", "unos Auriculares"— y no hay forma confiable de deducirlo del
   * nombre. Si falta, la pantalla usa "un".
   */
  article?: string;
  /**
   * Unidades planificadas para toda la campaña, sólo informativo.
   * NO es stock: el frontend nunca descuenta ni decide con este número. La
   * disponibilidad real la resuelve el backend contra su calendario.
   */
  quantity?: number;
  /** Descripción completa del producto (modelo, medidas). Uso interno/QA. */
  detail?: string;
  /** Código interno del proveedor. Nunca se muestra al usuario. */
  sku?: string;
}

export interface UserCodeCount {
  cedula: Cedula;
  count: number;
}

/** Estados posibles que el backend puede devolver al cargar un código. */
export type PromoCodeStatus =
  | 'WIN'
  | 'LOSE'
  | 'CODE_ALREADY_USED'
  | 'CODE_NOT_FOUND'
  | 'REGISTER_REQUIRED'
  /**
   * El participante superó el límite de validaciones (Avimovil: `limite`). No
   * tiene pantalla propia: el flujo muestra un mensaje en la carga de código.
   */
  | 'RATE_LIMITED';

export interface PromoCodeResult {
  status: PromoCodeStatus;
  /** Código tal como fue ingresado; se muestra en la pantalla de resultado. */
  code: string;
  /** Sólo presente cuando status === 'WIN'. */
  prize?: Prize;
  /** Contador de códigos cargados luego de esta operación. */
  codeCount: number;
  /** Mensaje opcional provisto por backend; si falta se usa el copy del diseño. */
  message?: string;
}

export interface ParticipantCheckResult {
  registered: boolean;
  participant?: Participant;
}

export interface RegistrationResult {
  ok: boolean;
  participant?: Participant;
  /** Errores por campo, para pintar feedback sin inventar reglas en el front. */
  fieldErrors?: Partial<Record<keyof RegistrationForm, string>>;
}

export interface Terms {
  /** El backend podrá enviar HTML sanitizado o texto plano. */
  termsHtml?: string;
  termsText?: string;
}

export interface SessionState {
  participant: Participant | null;
  codeCount: number;
  lastResult: PromoCodeResult | null;
  acceptedTerms: boolean;
}
