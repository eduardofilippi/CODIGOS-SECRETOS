import type { Participant, RegistrationForm } from '../types/promo';

/**
 * Registro del participante en ESTE navegador.
 * ---------------------------------------------------------------------------
 * El backend no tiene base de participantes: Avimovil recibe los datos de la
 * persona (nombre, teléfono, email, cédula, fecha de nacimiento, ciudad) en
 * cada canje. Por eso el registro vive en localStorage —igual que en la promo
 * anterior— y es lo que decide si hay que pasar por REGISTRO:
 *
 *   - Hay datos guardados para la cédula: la carga de código va derecho al
 *     canje, sin volver a mostrar el formulario, y ESOS datos son los que
 *     viajan en la request.
 *   - No hay datos: REGISTRO, y al confirmar se guardan acá.
 *
 * Es el único módulo que lee y escribe la clave. Los dos adapters
 * (`HttpPromoApi` y `MockPromoApi`) pasan por acá para comportarse igual;
 * ninguna pantalla toca `localStorage` directo.
 *
 * Una entrada por cédula: en un mismo dispositivo pueden participar varias
 * personas sin pisarse.
 */

const KEY_PREFIX = 'codigos-secretos:participant:';

export interface StoredParticipant {
  form: RegistrationForm;
  /**
   * Último contador conocido. Viaja en cada respuesta de canje; se guarda para
   * poder mostrarlo antes de canjear nada.
   */
  codeCount: number;
}

const FORM_KEYS: ReadonlyArray<keyof RegistrationForm> = [
  'fullName',
  'birthDate',
  'cedula',
  'email',
  'city',
  'phone',
];

/** Cédula sin puntos, guiones ni espacios: `1.234-567` y `1234567` son la misma persona. */
export function normalizeCedula(cedula: string): string {
  return cedula.replace(/[.\-\s]/g, '');
}

function storageKey(cedula: string): string {
  return `${KEY_PREFIX}${normalizeCedula(cedula)}`;
}

/**
 * Sólo cuenta como registro un formulario COMPLETO. El backend rechaza el canje
 * (`REGISTER_REQUIRED`) si falta cualquiera de los seis datos, así que una
 * entrada incompleta —de una versión vieja, o editada a mano— no sirve para
 * saltear el formulario: se trata como si no existiera.
 */
function isCompleteForm(value: unknown): value is RegistrationForm {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return FORM_KEYS.every((key) => {
    const field = record[key];
    return typeof field === 'string' && field.trim().length > 0;
  });
}

/** Registro guardado para esa cédula, o `null` si no hay (o no es usable). */
export function readStoredParticipant(cedula: string): StoredParticipant | null {
  try {
    const raw = localStorage.getItem(storageKey(cedula));
    if (!raw) return null;
    const data = JSON.parse(raw) as { form?: unknown; codeCount?: unknown };
    if (!isCompleteForm(data.form)) return null;
    return {
      form: data.form,
      codeCount: typeof data.codeCount === 'number' ? data.codeCount : 0,
    };
  } catch {
    // Sin localStorage (modo privado, origen opaco) o JSON roto: no hay registro.
    return null;
  }
}

/**
 * Guarda (o reemplaza) el registro. Sin `codeCount` se conserva el contador
 * que ya había: volver a registrarse no borra los códigos cargados.
 */
export function saveStoredParticipant(form: RegistrationForm, codeCount?: number): void {
  const count = codeCount ?? readStoredParticipant(form.cedula)?.codeCount ?? 0;
  try {
    localStorage.setItem(
      storageKey(form.cedula),
      JSON.stringify({ form, codeCount: count, savedAt: new Date().toISOString() }),
    );
  } catch {
    // Sin localStorage el flujo sigue: sólo se pierde el recuerdo del registro
    // y la persona vuelve a pasar por REGISTRO la próxima vez.
  }
}

/** Lo que las pantallas conocen del participante: sin email, teléfono ni fecha. */
export function toParticipant(form: RegistrationForm): Participant {
  return { cedula: form.cedula, fullName: form.fullName, city: form.city };
}
