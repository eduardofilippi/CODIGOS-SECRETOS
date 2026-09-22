import { ResultLayout } from '../../components/promo/ResultLayout';
import { PrizeReveal } from '../../components/promo/PrizeReveal';
import { PrizeRevealMobile } from '../../components/promo/PrizeRevealMobile';
import { useSession } from '../../app/SessionContext';
import { MOCK_PRIZES } from '../../mocks/prizes';
import type { Prize } from '../../types/promo';

/**
 * GANASTE — Figma 23:3081 (desktop) y "ganaste.png" (mobile).
 * El premio y el código llegan del resultado devuelto por el adapter.
 */
export default function Winner() {
  const { lastResult, codeCount } = useSession();

  /* Dos situaciones distintas, y se resuelven distinto:
     - Sin resultado en sesión: nadie jugó, entraron directo a la URL (así la
       enlaza el recorrido del demo). Se muestra un premio del catálogo como
       muestra de la pantalla.
     - Con resultado pero sin `prize`: el backend devolvió WIN incompleto. Ahí
       NO se inventa un premio —mostrar el equivocado es peor que no mostrar
       ninguno—: se felicita sin nombrarlo y el panel ya trae el teléfono. */
  const prize: Prize | undefined = lastResult ? lastResult.prize : MOCK_PRIZES[0];
  const message = prize
    ? `te ganaste ${prize.article ?? 'un'} ${prize.name}!`
    : 'te ganaste un premio!';

  return (
    <ResultLayout
      pageTitle="¡Felicidades! Ganaste"
      title="¡Felicidades"
      titleSize={160}
      mobileTitleSize={80}
      titleTone="gold"
      titleY={463}
      message={[message]}
      desktopMessageSingleLine
      messageSize={60}
      messageWidth={666}
      messageY={616}
      ctaY={711}
      code={lastResult?.code}
      codeCount={codeCount}
      /* La única pantalla con premio que reclamar, y la única que el PDF del
         22-09-2026 no marca: conserva el teléfono. */
      muestraTelefono
      scene={<PrizeReveal prize={prize} />}
      mobileScene={<PrizeRevealMobile prize={prize} />}
      /* El mensaje nombra el premio, que sale del catálogo: el mockup dibuja
         «te ganaste una Nintendo Switch!» y el sitio muestra el que devuelva el
         backend. El párrafo se achica a su contenido, así que su caja ES la
         tinta y el ancho depende del nombre, no del CSS.

         Medido en la propia pantalla, cambiándole el texto y leyendo la caja,
         contra el nodo 74:988 (39, 333x31):
           «…una Nintendo Switch!»       39.2  332.6x31.2   Δ  0.2  -0.4  0.2
           «…un PlayStation 5!»          58.3  294.3x31.2   Δ 19.3 -38.7  0.2
           «…una Nintendo Switch OLED!»  39.0  333.0x62.4   Δ  0.0   0.0 31.4
         Con la cadena del diseño la capa cierra en las tres medidas: lo que se
         aparta es el nombre, no la caja. Por eso acá sólo deciden el alto y la
         y, que no dependen del catálogo mientras el nombre entre en un renglón.
         La condición que lo cierra: si con «te ganaste una Nintendo Switch!» la
         caja se aparta de 39/333, ahí sí hay CSS que mirar. */
      mobileMensajeEjes="y,h"
    />
  );
}
