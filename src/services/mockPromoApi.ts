import type { PromoApi } from './promoApi';
import type {
  ParticipantCheckResult,
  Prize,
  PromoCode,
  PromoCodeResult,
  PromoCodeStatus,
  RegistrationForm,
  RegistrationResult,
  Terms,
  UserCodeCount,
} from '../types/promo';
import { MIN_AGE, isOfAge } from '../app/age';
import { MOCK_LATENCY_MS, getForcedPrizeId, getScenario } from '../mocks/scenarios';
import { MOCK_PRIZES } from '../mocks/prizes';
import { findCode, normalizeCode, seedRedeemed } from '../mocks/codes';
import { getTermsText } from '../mocks/terms';
import { readStoredParticipant, saveStoredParticipant, toParticipant } from './participantStorage';

const delay = (ms = MOCK_LATENCY_MS) => new Promise<void>((r) => setTimeout(r, ms));

/** Rotación usada por el escenario AUTO para recorrer todos los estados. */
const AUTO_CYCLE: PromoCodeStatus[] = ['WIN', 'LOSE', 'CODE_ALREADY_USED', 'CODE_NOT_FOUND'];

/**
 * Adapter de desarrollo.
 *
 * Por defecto (escenario `BASE`) consulta la base de códigos de ejemplo, así
 * que el resultado lo decide el código ingresado. Los demás escenarios fuerzan
 * un estado sin mirar el código, para poder abrir cualquier pantalla directo.
 *
 * En ninguno de los dos casos hay reglas de negocio reales: el sorteo y la
 * vigencia de los códigos son responsabilidad del backend.
 */
export class MockPromoApi implements PromoApi {
  /**
   * Respaldo en memoria para cuando no hay localStorage (modo privado, origen
   * opaco): el registro y el contador viven acá hasta recargar la página. Con
   * localStorage disponible manda `participantStorage`, igual que en el
   * adapter real, y el registro sobrevive a la recarga.
   */
  private registered = new Set<string>();
  private counts = new Map<string, number>();
  private autoIndex = 0;
  /** Recorrido del catálogo para los WIN forzados desde el panel de escenarios. */
  private prizeIndex = 0;
  /** Códigos ya consumidos en esta sesión, más los que vienen así de fábrica. */
  private redeemed = new Set<string>(seedRedeemed());

  async checkParticipant(cedula: string): Promise<ParticipantCheckResult> {
    await delay(400);
    // Interruptor de QA: fuerza la pantalla de REGISTRO aunque ya haya registro.
    if (getScenario() === 'REGISTER_REQUIRED') return { registered: false };

    // Con registro guardado en este navegador se saltea el formulario, también
    // después de recargar: es lo mismo que hace `HttpPromoApi`.
    const stored = readStoredParticipant(cedula);
    if (stored) return { registered: true, participant: toParticipant(stored.form) };

    if (!this.registered.has(cedula)) return { registered: false };
    return {
      registered: true,
      participant: { cedula, fullName: 'Pequeño pirata' },
    };
  }

  async registerParticipant(form: RegistrationForm): Promise<RegistrationResult> {
    await delay();

    // Regla de la promo, no de la pantalla: quien se registra tiene que tener la
    // edad mínima cumplida. Se rechaza acá —y no sólo en el formulario— porque
    // el backend real tendrá que hacer exactamente esto.
    if (!isOfAge(form.birthDate)) {
      return {
        ok: false,
        fieldErrors: {
          birthDate: `El registro lo hace un tutor de ${MIN_AGE} años cumplidos.`,
        },
      };
    }

    this.registered.add(form.cedula);
    saveStoredParticipant(form);
    return { ok: true, participant: toParticipant(form) };
  }

  async submitPromoCode({ cedula, code }: PromoCode): Promise<PromoCodeResult> {
    await delay();

    const { status, prize } = this.resolve(code);

    // Sólo los códigos efectivamente consumidos suman al contador.
    const consumed = status === 'WIN' || status === 'LOSE';
    const next = this.currentCount(cedula) + (consumed ? 1 : 0);
    this.setCount(cedula, next);

    return { status, code, codeCount: next, prize };
  }

  /** El contador sale del registro guardado; sin él, del respaldo en memoria. */
  private currentCount(cedula: string): number {
    return readStoredParticipant(cedula)?.codeCount ?? this.counts.get(cedula) ?? 0;
  }

  private setCount(cedula: string, count: number): void {
    this.counts.set(cedula, count);
    const stored = readStoredParticipant(cedula);
    if (stored) saveStoredParticipant(stored.form, count);
  }

  /**
   * Escenario `BASE`: se consulta la base de ejemplo, igual que hará el backend
   * contra su tabla. Cualquier otro escenario fuerza el estado y no toca la base.
   */
  private resolve(code: string): { status: PromoCodeStatus; prize?: Prize } {
    const scenario = getScenario();

    if (scenario !== 'BASE') {
      const status: PromoCodeStatus =
        scenario === 'AUTO' ? AUTO_CYCLE[this.autoIndex++ % AUTO_CYCLE.length] : scenario;
      return { status, prize: status === 'WIN' ? this.pickPreviewPrize() : undefined };
    }

    const record = findCode(code);
    if (!record) return { status: 'CODE_NOT_FOUND' };
    if (this.redeemed.has(record.code)) return { status: 'CODE_ALREADY_USED' };

    // A partir de acá el código se consume: un segundo intento dará ALREADY_USED.
    this.redeemed.add(record.code);

    if (record.outcome === 'LOSE') return { status: 'LOSE' };
    return {
      status: 'WIN',
      prize: MOCK_PRIZES.find((p) => p.id === record.prizeId) ?? MOCK_PRIZES[0],
    };
  }

  /** Expuesto sólo para la demo: permite listar los códigos de prueba. */
  isRedeemed(code: string): boolean {
    return this.redeemed.has(normalizeCode(code));
  }

  async getCodeCount(cedula: string): Promise<UserCodeCount> {
    await delay(200);
    return { cedula, count: this.currentCount(cedula) };
  }

  async getPrizes(): Promise<Prize[]> {
    await delay(200);
    return MOCK_PRIZES;
  }

  async getTerms(): Promise<Terms> {
    await delay(200);
    return { termsText: getTermsText() };
  }

  /** Elige un premio del catálogo mock. NO representa una regla de sorteo. */
  /**
   * Premio para los escenarios forzados (DEV/QA, nunca la base de códigos).
   *
   * Si el panel fijó uno, ése; si no, se recorre el catálogo en orden en vez de
   * sortearlo al azar: así se pueden revisar los 19 en la pantalla GANASTE sin
   * que ninguno se repita ni se saltee. Nada de esto es lógica de negocio.
   */
  private pickPreviewPrize(): Prize {
    const forced = getForcedPrizeId();
    if (forced) {
      const match = MOCK_PRIZES.find((p) => p.id === forced);
      if (match) return match;
    }
    return MOCK_PRIZES[this.prizeIndex++ % MOCK_PRIZES.length];
  }
}
