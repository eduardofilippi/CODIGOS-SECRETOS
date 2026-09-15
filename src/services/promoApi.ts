import type {
  ParticipantCheckResult,
  Prize,
  PromoCode,
  PromoCodeResult,
  RegistrationForm,
  RegistrationResult,
  Terms,
  UserCodeCount,
} from '../types/promo';

/**
 * Contrato único entre el frontend y el backend.
 * -------------------------------------------------------------------------
 * Hoy resuelve `MockPromoApi`. Cuando exista el backend real, el otro equipo
 * implementa `HttpPromoApi` con la misma interfaz y sólo cambia la línea del
 * export de abajo. Ninguna pantalla se toca.
 */
export interface PromoApi {
  /** ¿Esta cédula ya está registrada? Define si mandamos a REGISTRO. */
  checkParticipant(cedula: string): Promise<ParticipantCheckResult>;
  registerParticipant(form: RegistrationForm): Promise<RegistrationResult>;
  /** Valida y consume el código. TODA la regla de premio vive del lado servidor. */
  submitPromoCode(input: PromoCode): Promise<PromoCodeResult>;
  getCodeCount(cedula: string): Promise<UserCodeCount>;
  getPrizes(): Promise<Prize[]>;
  getTerms(): Promise<Terms>;
}

export { MockPromoApi } from './mockPromoApi';

import { MockPromoApi } from './mockPromoApi';
import { HttpPromoApi } from './httpPromoApi';

/**
 * PUNTO DE SUSTITUCIÓN PARA BACKEND
 * ---------------------------------
 * Con `VITE_API_URL` cargada en `.env` se usa el backend real
 * (codigos-secretos-backend); vacía, siguen los datos de ejemplo. Así la demo
 * de GitHub Pages sigue funcionando sin servidor.
 */
const API_BASE_URL = (import.meta.env.VITE_API_URL ?? '').trim();

export const promoApi: PromoApi = API_BASE_URL
  ? new HttpPromoApi(API_BASE_URL)
  : new MockPromoApi();
