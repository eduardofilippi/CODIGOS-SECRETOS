import { motion } from 'framer-motion';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { MobileScene } from '../layout/MobileStage';
import { mbox } from '../../app/mobileStage';
import type { Prize } from '../../types/promo';
import './closed-chest-mobile.css';
import './prize-reveal.css';

import cofreAbierto from '../../assets/promo/cofre-abierto.webp';
import cofreCerrado from '../../assets/promo/cofre-cerrado.webp';
import glow from '../../assets/effects/glow.webp';

/**
 * Alto de la escena en px del lienzo mobile. Las cuatro capas del frame van de
 * y 392 —el borde de arriba de `glow-Photoroom 2`— a 866.6, el de abajo del
 * cofre; la escena las cubre desde 392 y las cajas de abajo son esa y menos
 * 392. La escena en sí no es un nodo: en el Figma las cuatro cuelgan del frame.
 */
const SCENE_H = 475;

/* Misma coreografía que la versión desktop (`PrizeReveal`), con las cajas del
   Figma mobile: anticipación → apertura → estallido de luz → el premio emerge. */
const T = { anticipation: 0.28, open: 0.34, prize: 0.62 };

/* Los dos resplandores son el MISMO asset girado distinto: `glow-Photoroom 3`
   (74:1012) a -53.7° y `glow-Photoroom 2` (74:1014) a -76.5°. Los dos miden
   383.6x243.9 sin rotar, que es lo que declara `tamano` en el spec.

   El 3 va ademas VOLTEADO EN VERTICAL. El volteo no esta en el spec —el pull
   guarda `rotation` pero no el signo de la escala— y la caja envolvente no lo
   delata, porque espejar no la cambia. Se resolvio comparando el render del
   nodo contra el asset girado de las ocho maneras: `rotate(-53.7deg)
   scaleY(-1)` da 0.998 de correlacion y el giro solo, 0.024. El 2 no lleva
   volteo: asi da 0.998. */
const GIRO_3 = 'rotate(-53.7deg) scaleY(-1)';
const GIRO_2 = 'rotate(-76.5deg)';
const openAt = T.anticipation;
const lightAt = openAt + T.open * 0.4;
const prizeAt = lightAt + 0.12;

interface Props {
  /**
   * Llega por props desde el resultado del backend: acá no se elige nada.
   * Opcional por el mismo motivo que en `PrizeReveal`: si el backend manda WIN
   * sin premio, el cofre se abre y no emerge ningún producto.
   */
  prize?: Prize;
}

/**
 * Reveal del ganador en mobile — export "ganaste.png". Sus 969 px incluyen
 * 62 de barra de estado de iOS: las cajas de abajo están medidas contra el
 * área útil de 907, donde el cofre visible mide 195x218 y se apoya en y=558.
 *
 * El diseño mobile SÍ incluye el cofre abriéndose con el premio emergiendo; no
 * es una versión reducida que muestre sólo el premio.
 */
export function PrizeRevealMobile({ prize }: Props) {
  const reduced = useReducedMotion();

  if (reduced) {
    return (
      <MobileScene height={SCENE_H} className="mchest">
        <div className="mchest__planet" aria-hidden="true" />
        <img src={glow} alt="" aria-hidden="true"
          className="mabs mlayer-img reveal__glow"
          style={{ ...mbox({ x: -33.9, y: 107.4, w: 383.6, h: 243.9, sceneH: SCENE_H }), transform: GIRO_3 }}
          data-figma="74:1012" />
        <img src={cofreAbierto} alt="" aria-hidden="true"
          className="mabs mlayer-img mchest__img"
          style={mbox({ x: 56, y: 195.6, w: 279, h: 279, sceneH: SCENE_H })}
          data-figma="74:1013" />
        <img src={glow} alt="" aria-hidden="true"
          className="mabs mlayer-img reveal__glow"
          style={{ ...mbox({ x: 117.25, y: 93, w: 383.6, h: 243.9, sceneH: SCENE_H }), transform: GIRO_2 }}
          data-figma="74:1014" />
        {prize?.image && (
          <img src={prize.image} alt={prize.name}
            className="mabs mlayer-img reveal__prize reveal__prize-layer"
            style={mbox({ x: 146, y: 92.6, w: 224, h: 230, sceneH: SCENE_H })}
            data-figma="74:1015" />
        )}
      </MobileScene>
    );
  }

  return (
    <MobileScene height={SCENE_H} className="mchest">
      <div className="mchest__planet" aria-hidden="true" />

      {/* El resplandor que sale del cofre son DOS capas del mismo asset, giradas
          distinto: `glow-Photoroom 3` por detrás y `glow-Photoroom 2` por
          delante del cofre, como en el orden del frame.
          El giro va en un contenedor y la animación en la imagen de adentro:
          Framer Motion escribe `transform` y se comería la rotación. */}
      <div
        className="mabs"
        style={{ ...mbox({ x: -33.9, y: 107.4, w: 383.6, h: 243.9, sceneH: SCENE_H }), transform: GIRO_3 }}
        data-figma="74:1012"
      >
        <motion.img
          src={glow}
          alt=""
          aria-hidden="true"
          className="mlayer-img reveal__glow"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: [0, 1, 0.75], scale: [0.5, 1.16, 1] }}
          transition={{ delay: lightAt, duration: 1.1, times: [0, 0.45, 1], ease: 'easeOut' }}
        />
      </div>

      {/* Cofre: se comprime y luego abre. */}
      <motion.div
        className="mabs mchest__img"
        style={mbox({ x: 56, y: 195.6, w: 279, h: 279, sceneH: SCENE_H })}
        data-figma="74:1013"
        initial={{ scale: 0.86, y: '4%', opacity: 0 }}
        animate={{ scale: [0.86, 0.94, 1.06, 1], y: ['4%', '2%', '-1%', '0%'], opacity: 1 }}
        transition={{ duration: T.anticipation + T.open + 0.3, ease: 'easeOut', times: [0, 0.35, 0.72, 1] }}
      >
        <motion.img
          src={cofreCerrado} alt="" aria-hidden="true" className="mlayer-img mchest__stack"
          initial={{ opacity: 1 }} animate={{ opacity: 0 }}
          transition={{ delay: openAt, duration: 0.12 }}
        />
        <motion.img
          src={cofreAbierto} alt="" aria-hidden="true" className="mlayer-img mchest__stack"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ delay: openAt, duration: 0.12 }}
        />
      </motion.div>

      {/* El segundo resplandor va DELANTE del cofre, como en el frame. */}
      <div
        className="mabs"
        style={{ ...mbox({ x: 117.25, y: 93, w: 383.6, h: 243.9, sceneH: SCENE_H }), transform: GIRO_2 }}
        data-figma="74:1014"
      >
        <motion.img
          src={glow}
          alt=""
          aria-hidden="true"
          className="mlayer-img reveal__glow"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: [0, 1, 0.75], scale: [0.5, 1.16, 1] }}
          transition={{ delay: lightAt + 0.1, duration: 1.1, times: [0, 0.45, 1], ease: 'easeOut' }}
        />
      </div>

      {/* Premio: emerge desde dentro del cofre. */}
      {prize?.image && (
      <motion.div
        className="mabs reveal__prize-layer"
        style={mbox({ x: 146, y: 92.6, w: 224, h: 230, sceneH: SCENE_H })}
        data-figma="74:1015"
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
        </motion.div>
        {/* Acá iban unas partículas doradas, el componente `Sparkles`. NO ESTÁN EN EL
            DISEÑO: en `ganaste-mobile` no hay ningún nodo que les corresponda.
            Alrededor del cofre el frame tiene sólo `glow-Photoroom 3` (-53.7°),
            `glow-Photoroom 2` (-76.5°) y los dos resplandores del propio nodo
            `cofre 1`. Se sacaron. */}
      </motion.div>
      )}
    </MobileScene>
  );
}
