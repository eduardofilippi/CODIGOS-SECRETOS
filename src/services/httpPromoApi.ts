import type { PromoApi } from './promoApi';
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
import { MOCK_PRIZES, prizeByAvimovilId } from '../mocks/prizes';
import { getTermsText } from '../mocks/terms';
import { MIN_AGE, isOfAge } from '../app/age';
import {
  readStoredParticipant,
  saveStoredParticipant,
  toParticipant,
} from './participantStorage';

/**
 * Adapter real: habla con codigos-secretos-backend.
 * ---------------------------------------------------------------------------
 * El backend no tiene base de datos propia: reenvía cada canje a Avimovil con
 * los datos del participante como variables (nombre, telefono, email, cedula,
 * dob, localidad). Por eso el registro vive en el navegador
 * (`participantStorage`) y se manda completo en cada canje.
 *
 * Qué resuelve cada método:
 *   checkParticipant    localStorage: ¿hay registro para esta cédula en este
 *                       navegador? Si lo hay, la carga de código saltea REGISTRO.
 *   registerParticipant localStorage (no existe endpoint de registro; la regla
 *                       de edad mínima se valida acá, igual que en el mock)
 *   submitPromoCode     POST /api/codes/redeem con los datos guardados
 *   getCodeCount        último contador conocido (viaja en cada respuesta)
 *   getPrizes/getTerms  catálogo estático del bundle, igual que el mock
 */
export class HttpPromoApi implements PromoApi {
  private readonly baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  // ------------------------------------------------------------------ HTTP

  private async post<T>(path: string, body: unknown): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      // 403 = reCAPTCHA rechazado; el resto, errores del servidor. En ambos
      // casos se lanza: useCodeFlow ya muestra el mensaje de error genérico.
      throw new Error(`API ${path} respondió ${response.status}`);
    }
    return (await response.json()) as T;
  }

  // -------------------------------------------------------------- PromoApi

  async checkParticipant(cedula: string): Promise<ParticipantCheckResult> {
    const stored = readStoredParticipant(cedula);
    if (!stored) return { registered: false };
    return { registered: true, participant: toParticipant(stored.form) };
  }

  async registerParticipant(form: RegistrationForm): Promise<RegistrationResult> {
    // Regla de la promo, no de la pantalla: sin backend de registro, la edad
    // mínima se valida acá para que el flujo se comporte igual que con el mock.
    if (!isOfAge(form.birthDate)) {
      return {
        ok: false,
        fieldErrors: {
          birthDate: `El registro lo hace un tutor de ${MIN_AGE} años cumplidos.`,
        },
      };
    }

    saveStoredParticipant(form);
    return { ok: true, participant: toParticipant(form) };
  }

  async submitPromoCode({ cedula, code, recaptchaToken }: PromoCode): Promise<PromoCodeResult> {
    const stored = readStoredParticipant(cedula);
    if (!stored) {
      // Sin datos no hay canje: Avimovil los necesita en cada envío.
      return { status: 'REGISTER_REQUIRED', code, codeCount: 0 };
    }

    // Los datos que viajan son los guardados en el registro, no los de la
    // pantalla: la carga de código sólo pide cédula y código.
    const { form } = stored;
    const result = await this.post<PromoCodeResult>('/api/codes/redeem', {
      cedula: form.cedula,
      code,
      recaptchaToken,
      nombre: form.fullName,
      telefono: form.phone,
      email: form.email,
      dob: form.birthDate,
      localidad: form.city,
    });

    if (typeof result.codeCount === 'number') {
      saveStoredParticipant(form, result.codeCount);
    }
    return result.prize ? { ...result, prize: this.enrichPrize(result.prize) } : result;
  }

  /**
   * El backend devuelve el premio con el id de Avimovil y el nombre en crudo
   * (`{ id: '3', name: 'BICICLETA MILANO ARO 16' }`). Acá se cruza con el
   * catálogo local para resolver imagen, artículo y nombre comercial —los
   * assets viven en el bundle, no en el backend—.
   *
   * Si el id no está en el catálogo (p. ej. el premio de prueba, id 0), se
   * devuelve lo que vino: se muestra el nombre sin imagen, antes que un premio
   * equivocado.
   */
  private enrichPrize(prize: Prize): Prize {
    const avimovilId = Number(prize.id);
    if (Number.isInteger(avimovilId)) {
      const catalogPrize = prizeByAvimovilId(avimovilId);
      if (catalogPrize) return catalogPrize;
    }
    return prize;
  }

  async getCodeCount(cedula: string): Promise<UserCodeCount> {
    return { cedula, count: readStoredParticipant(cedula)?.codeCount ?? 0 };
  }

  /** El catálogo y las bases siguen siendo estáticos del bundle, como el mock. */
  async getPrizes(): Promise<Prize[]> {
    return MOCK_PRIZES;
  }

  async getTerms(): Promise<Terms> {
    return { termsText: getTermsText() };
  }
}
