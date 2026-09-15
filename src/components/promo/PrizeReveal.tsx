import { motion } from 'framer-motion';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { box } from '../../app/stage';
import type { Prize } from '../../types/promo';
import './prize-reveal.css';

import cofreAbierto from '../../assets/promo/cofre-abierto.webp';
import cofreCerrado from '../../assets/promo/cofre-cerrado.webp';
import glow from '../../assets/effects/glow.webp';

interface PrizeRevealProps {
  /**
   * Llega por props desde el resultado del backend. Acá no se elige nada.
   * Puede faltar si el backend devuelve WIN sin premio: en ese caso el cofre
   * se abre igual y no emerge ningún producto, en vez de mostrar uno inventado.
   */
  prize?: Prize;
}

/* Coordenadas del Figma (23:3136 cofre, 23:3137 premio, 23:3138/9 glows). */
const CHEST = { x: 1032, y: 330, w: 682, h: 682 };

/* EL DESTELLO SON DOS CAPAS, NO UNA. Acá había un solo `glow.webp` sin girar en
   una caja de 900x620 que no sale de ningún nodo. El frame tiene DOS capas del
   MISMO asset, giradas distinto, y una a cada lado del cofre:

     glow-Photoroom 3   23:3139   -53.7°, espejado   detrás del cofre
     glow-Photoroom 2   23:3138   -76.5°             delante del cofre

   La versión mobile ya lo hacía así; era el desktop el que estaba corto.

   LAS CAJAS SON LAS SIN GIRAR, CENTRADAS EN EL CENTRO DE LA CAJA GIRADA. El
   spec da las dos cosas: `tamano` es 939.3x597.2 en las dos —el asset sin
   girar— y `rect` es la envolvente después del giro. Un elemento rotado se
   coloca con su tamaño propio y el navegador calcula la envolvente, así que
   hay que partir del centro:

     glow 3   rect 842, -199, 1037.7 x 1110.5   ->  centro 1360.85, 356.25
     glow 2   rect 1252.8, -148.9, 799.4 x 1052.5 -> centro 1652.5, 377.35

   Comprobado al revés: girar 939.3x597.2 por -53.7° da una envolvente de
   1037.4x1110.3 contra las 1037.7x1110.5 del spec, y por -76.5° da
   799.9x1052.8 contra 799.4x1052.5. Menos de medio píxel de diseño.

   El ESPEJO del 3 está en el spec (`espejo: true`) y coincide con lo que se
   había medido para mobile por correlación contra el render del nodo: con
   `scaleY(-1)` da 0.998 y sin él 0.024. */
const GLOW_3 = { x: 891.2, y: 57.65, w: 939.3, h: 597.2 };
const GLOW_2 = { x: 1182.85, y: 78.75, w: 939.3, h: 597.2 };
const GIRO_3 = 'rotate(-53.7deg) scaleY(-1)';
const GIRO_2 = 'rotate(-76.5deg)';
/* Ajustado midiendo la silueta de la Switch en GANASTE.png: la caja anterior la
   dejaba un 15% chica y 49 px a la izquierda. */
const PRIZE = { x: 1270, y: 48, w: 635, h: 653 };
const T = {
  anticipation: 0.28,
  open: 0.34,
  light: 0.3,
  prize: 0.62,
};

/**
 * Secuencia del ganador:
 * anticipación del cofre → apertura → estallido de luz → el premio emerge del
 * cofre con halo holográfico → partículas y glow en idle.
 *
 * El premio llega por props: esta pieza no ejecuta ninguna lógica de sorteo.
 */
export function PrizeReveal({ prize }: PrizeRevealProps) {
  const reduced = useReducedMotion();

  if (reduced) {
    // Sin movimiento: se muestra el estado final con un fundido simple.
    return (
      <div className="reveal reveal--static">
        <div className="abs" style={{ ...box(GLOW_3), transform: GIRO_3 }} data-figma="23:3139">
          <img src={glow} alt="" aria-hidden="true" className="reveal__glow reveal__glow-img" />
        </div>
        <img src={cofreAbierto} alt="" aria-hidden="true" className="abs reveal__chest" style={box(CHEST)} />
        <div className="abs" style={{ ...box(GLOW_2), transform: GIRO_2 }} data-figma="23:3138">
          <img src={glow} alt="" aria-hidden="true" className="reveal__glow reveal__glow-img" />
        </div>
        {prize?.image && (
          <img src={prize.image} alt={prize.name} className="abs reveal__prize" style={box(PRIZE)} />
        )}
      </div>
    );
  }

  const openAt = T.anticipation;
  const lightAt = openAt + T.open * 0.4;
  const prizeAt = lightAt + 0.12;

  return (
    <div className="reveal">
      {/* Primer resplandor: `glow-Photoroom 3`, DETRÁS del cofre.
          El giro va en el contenedor y la animación en la imagen de adentro:
          Framer Motion escribe `transform` y se comería la rotación. Es la
          misma estructura que usa `PrizeRevealMobile`. */}
      <div className="abs" style={{ ...box(GLOW_3), transform: GIRO_3 }} data-figma="23:3139">
        <motion.img
          src={glow}
          alt=""
          aria-hidden="true"
          className="reveal__glow reveal__glow-img"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: [0, 1, 1], scale: [0.5, 1.16, 1] }}
          transition={{ delay: lightAt, duration: 1.1, times: [0, 0.45, 1], ease: 'easeOut' }}
        />
      </div>

      {/* Cofre: anticipación (se comprime) y luego apertura. */}
      <motion.div
        className="abs reveal__chest-wrap"
        style={box(CHEST)}
        initial={{ scale: 0.86, y: '4%', opacity: 0 }}
        animate={{ scale: [0.86, 0.94, 1.06, 1], y: ['4%', '2%', '-1%', '0%'], opacity: 1 }}
        transition={{ duration: T.anticipation + T.open + 0.3, ease: 'easeOut', times: [0, 0.35, 0.72, 1] }}
      >
        <motion.img
          src={cofreCerrado}
          alt=""
          aria-hidden="true"
          className="reveal__chest reveal__chest--closed"
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ delay: openAt, duration: 0.12 }}
        />
        <motion.img
          src={cofreAbierto}
          alt=""
          aria-hidden="true"
          className="reveal__chest"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: openAt, duration: 0.12 }}
        />
      </motion.div>

      {/* Segundo resplandor: `glow-Photoroom 2`, DELANTE del cofre y detrás del
          premio, como en el orden del frame. Entra un pelo después que el otro,
          igual que en mobile. */}
      <div className="abs" style={{ ...box(GLOW_2), transform: GIRO_2 }} data-figma="23:3138">
        <motion.img
          src={glow}
          alt=""
          aria-hidden="true"
          className="reveal__glow reveal__glow-img"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: [0, 1, 1], scale: [0.5, 1.16, 1] }}
          transition={{ delay: lightAt + 0.1, duration: 1.1, times: [0, 0.45, 1], ease: 'easeOut' }}
        />
      </div>

      {/* Premio: emerge desde dentro del cofre hacia su posición final. */}
      {prize?.image && (
      <motion.div
        className="abs reveal__prize-wrap"
        style={box(PRIZE)}
        initial={{ opacity: 0, y: '78%', scale: 0.45 }}
        animate={{ opacity: 1, y: '0%', scale: 1 }}
        transition={{ delay: prizeAt, duration: T.prize, ease: [0.16, 0.9, 0.28, 1] }}
      >
        <motion.div
          className="reveal__prize-float"
          animate={{ y: ['0%', '-2.6%', '0%'] }}
          transition={{ delay: prizeAt + T.prize, duration: 5.2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <img src={prize.image} alt={prize.name} className="reveal__prize" />
          <span
            className="reveal__holo"
            aria-hidden="true"
            style={{ '--holo-mask': `url(${prize.image})` } as React.CSSProperties}
          />
        </motion.div>
        {/* Acá iban unas partículas doradas, el componente `Sparkles`. NO ESTÁN EN EL
            DISEÑO: en `ganaste` no hay ningún nodo que les corresponda.
            Alrededor del cofre el frame tiene sólo `glow-Photoroom 3` (-53.7°),
            `glow-Photoroom 2` (-76.5°) y los dos resplandores del propio nodo
            `cofre 1`. Se sacaron. */}
      </motion.div>
      )}
    </div>
  );
}
