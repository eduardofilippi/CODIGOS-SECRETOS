import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { promoApi } from '../services/promoApi';
import { getRecaptchaToken } from '../services/recaptcha';
import { useSession } from './SessionContext';
import type { PromoCodeStatus } from '../types/promo';

/**
 * Cada estado navegable tiene su pantalla del Figma. `REGISTER_REQUIRED` y
 * `RATE_LIMITED` no navegan (se resuelven antes), por eso quedan fuera.
 */
const ROUTE_BY_STATUS: Record<
  Exclude<PromoCodeStatus, 'REGISTER_REQUIRED' | 'RATE_LIMITED'>,
  string
> = {
  WIN: '/ganaste',
  LOSE: '/perdiste',
  CODE_ALREADY_USED: '/codigo-utilizado',
  CODE_NOT_FOUND: '/codigo-inexistente',
};

/**
 * `limite` de Avimovil: no hay pantalla, se avisa en la misma carga de código.
 * El token que manda el backend no es copy; el mensaje se define acá.
 */
const RATE_LIMIT_MESSAGE =
  'Hiciste muchos intentos seguidos. Esperá unos minutos y volvé a probar.';

/**
 * Respuesta que el frontend no sabe interpretar. NO se adivina qué quiso decir
 * el backend: se avisa y se deja a la persona donde estaba, con el código
 * escrito, para que pueda reintentar.
 */
const ESTADO_DESCONOCIDO_MESSAGE =
  'Recibimos una respuesta que no pudimos interpretar. Probá de nuevo; si sigue pasando, avisanos.';

/**
 * Orquesta el flujo de participación.
 *
 * NO contiene ninguna regla de negocio: pregunta al adapter y navega a la
 * pantalla que corresponde al `status` recibido. Cuando exista `HttpPromoApi`
 * este hook no cambia.
 */
export function useCodeFlow() {
  const navigate = useNavigate();
  const { setParticipant, setLastResult } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Canjea el código y abre la pantalla del `status` recibido, sin volver a
   * preguntar si la cédula está registrada.
   *
   * Lo usa REGISTRO al confirmar: la mecánica (lámina 2) manda del registro
   * derecho al resultado, no de vuelta al formulario de carga.
   */
  const redeem = useCallback(
    async (cedula: string, code: string) => {
      setLoading(true);
      setError(null);
      try {
        // Se pide recién acá: el token dura dos minutos y es de un solo uso.
        const recaptchaToken = await getRecaptchaToken('redeem_code');
        const result = await promoApi.submitPromoCode({ cedula, code, recaptchaToken });
        setLastResult(result);

        if (result.status === 'REGISTER_REQUIRED') {
          navigate('/registro', { state: { cedula, code } });
          return;
        }

        if (result.status === 'RATE_LIMITED') {
          // Sin pantalla propia: se queda en la carga de código con el aviso.
          setError(RATE_LIMIT_MESSAGE);
          return;
        }

        /* EL TIPO NO ES UNA GARANTÍA. `result.status` está tipado como
           `PromoCodeStatus`, pero ese tipo describe lo que el frontend ESPERA,
           no lo que la red entrega: la respuesta se castea en `httpPromoApi` sin
           validar. Si el backend manda un estado que no está en la tabla —otro
           vocabulario, un caso nuevo, un error serializado como éxito—,
           `ROUTE_BY_STATUS[...]` da `undefined` y `navigate(undefined)` deja a la
           persona en la pantalla de carga sin pantalla nueva y sin aviso: parece
           que el botón no hace nada.

           Por eso se busca la ruta primero y se comprueba. El `as` es a
           propósito: obliga a TypeScript a admitir la comprobación que él cree
           innecesaria y que en tiempo de ejecución sí hace falta. */
        const ruta = (ROUTE_BY_STATUS as Record<string, string | undefined>)[
          result.status
        ];

        if (!ruta) {
          /* Queda en la consola para poder diagnosticarlo contra el backend
             real. Se registra sólo el token del estado, que no es dato personal. */
          console.warn('[canje] estado no reconocido en la respuesta:', result.status);
          setError(ESTADO_DESCONOCIDO_MESSAGE);
          return;
        }

        navigate(ruta);
      } catch {
        setError('No pudimos contactar la nave nodriza. Probá de nuevo en un momento.');
      } finally {
        setLoading(false);
      }
    },
    [navigate, setLastResult],
  );

  const submit = useCallback(
    async (cedula: string, code: string) => {
      setLoading(true);
      setError(null);
      try {
        /* ¿Hay que pasar por REGISTRO? Lo responde el adapter mirando el
           registro guardado en este navegador (`participantStorage`): con
           datos para esa cédula se saltea el formulario y el canje viaja con
           esos datos; sin datos, se abre el formulario conservando el código. */
        const check = await promoApi.checkParticipant(cedula);

        if (!check.registered) {
          // Aún no está registrado: el diseño manda a REGISTRO conservando el código.
          navigate('/registro', { state: { cedula, code } });
          return;
        }

        setParticipant(check.participant ?? { cedula, fullName: '' });
      } catch {
        setError('No pudimos contactar la nave nodriza. Probá de nuevo en un momento.');
        setLoading(false);
        return;
      }
      await redeem(cedula, code);
    },
    [navigate, redeem, setParticipant],
  );

  return { submit, redeem, loading, error };
}
