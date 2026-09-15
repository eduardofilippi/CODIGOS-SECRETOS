import { useNavigate } from 'react-router-dom';
import { Stage } from '../../components/layout/Stage';
import { MobileScene } from '../../components/layout/MobileStage';
import { Deco } from '../../components/layout/Deco';
import { FloatingLayer } from '../../components/effects/FloatingLayer';
import { PromoButton } from '../../components/buttons/PromoButton';
import { PurosolShip } from '../../components/promo/PurosolShip';
import { box, centeredText } from '../../app/stage';
import { mbox } from '../../app/mobileStage';
import './home.css';

import { LogoCodigos } from '../../components/promo/LogoCodigos';
import logoCodigos from '../../assets/logos/codigos-secretos.webp';
import planetaPremios from '../../assets/planets/planeta-premios.webp';
import planetaVit1 from '../../assets/planets/planeta-vit-1.webp';
import planetaVit2 from '../../assets/planets/planeta-vit-2.webp';
import glow from '../../assets/effects/glow.webp';
import destello from '../../assets/effects/destello.webp';
import auriculares from '../../assets/prizes/auriculares.webp';
/* El auricular de MOBILE va aparte. La capa se dibuja a 78x78 px de diseno, que
   en un telefono a 3x son unos 229 px fisicos, y `auriculares.webp` tiene 168:
   se estiraba 1,36x, el peor de los tres premios del cumulo. Este PNG sale del
   original de la clienta a 4167 px. Es el mismo producto en otra pose —mas
   frontal, con las dos copas a la vista—, cambio aprobado el 03-09-2026 porque
   del dibujo actual no existe version en alta. ESCRITORIO SIGUE CON EL WEBP: su
   capa mide 168x169, o sea exactamente el tamano del archivo, y ahi no hay nada
   que corregir. */
import auricularesMobile from '../../assets/prizes/auriculares-mobile.png';
import playstation from '../../assets/prizes/playstation.webp';
/* En mobile el cúmulo lleva la consola SOLA: landing.png no dibuja el joystick,
   que sí trae `playstation.webp` y es el que usa la composición de desktop. */
import playstationConsola from '../../assets/prizes/playstation-consola.png';
/* El Nintendo del landing, en las DOS composiciones. Reemplazo de imagen pedido
   el 03-09-2026: el Switch OLED blanco visto de frente, con la pantalla
   encendida. Va en PNG y en un solo archivo para escritorio y mobile, que antes
   eran dos —`nintendo.webp` y `nintendo-mobile.png`— porque el asset viejo
   llegaba comprimido y en mobile convenia el original sin perdida. Con la imagen
   nueva esa distincion deja de tener sentido.

   MISMO LIENZO QUE EL ASSET VIEJO: 325x326, asi que la capa no cambia de caja ni
   de posicion en ninguna de las dos vistas. El aparato queda mas ancho y mas
   bajo porque la pose es otra —el nuevo esta horizontal y el anterior en
   diagonal—, no porque se haya tocado ninguna medida. */
import nintendo from '../../assets/prizes/nintendo.png';
import barco from '../../assets/promo/barco.webp';

/**
 * INICIO — Figma 13:49.
 *
 * Coordenadas tomadas 1:1 del diseño. Cada elemento es una capa independiente
 * (nada de screenshot de fondo) para poder flotar a distinta profundidad.
 */
export default function Home() {
  const navigate = useNavigate();
  const goParticipar = () => navigate('/participar');

  return (
    <Stage
      /* PRIORIDAD DE DESCARGA — sólo la landing, y no cambia nada visual.
         Medido contra el build publicado: las quince imágenes se descubrían
         todas entre 634 y 640 ms, o sea después de bajar el JS, ejecutarlo y
         que React renderizara. El fondo y el logo van en `preload` desde el
         HTML (ver `vite.config.ts`) y acá se les marca la prioridad; las
         decoraciones bajan a `low` para que no compitan en ese momento. */
      mobileBgPrioridad="high"
      title="El Tesoro Galáctico de los Códigos Secretos 2026"
      /* `CODIGO 1` (70:168): el encuadre de la foto, que no es el que da
         `object-fit: cover` sobre el viewport. */
      mobileCielo={{ nodo: '70:168', x: -46, y: -38, w: 493, h: 1070 }}
      /* `Rectangle 6` (117:293): el velo que el frame apoya sobre la foto. */
      mobileVelo={<div className="home-m__velo" data-figma="117:293" />}
      mobile={<HomeMobile onStart={goParticipar} />}
    >
      {/* --- Universo lejano --- */}
      <Deco
        src={planetaVit2}
        x={7}
        y={60}
        w={169}
        h={184}
        rotate={15.05}
        blur={5}
        opacity={0.8}
        float={{ amplitude: 6, duration: 6.4, delay: 0.4, drift: 3 }}
      />
      <Deco
        src={planetaVit1}
        x={1073}
        y={962}
        w={339}
        h={166}
        blur={5}
        opacity={0.9}
        float={{ amplitude: 5, duration: 7, delay: 1.1, drift: -4 }}
      />
      <Deco
        src={destello}
        x={1276}
        y={171}
        w={415}
        h={275}
        float={{ amplitude: 9, duration: 4.6, delay: 0.2 }}
      />

      {/* --- Nave: entra navegando desde la derecha y queda flotando --- */}
      <PurosolShip variant="enter" style={{ ...box({ x: 1322, y: 273, w: 1016, h: 696 }), zIndex: 3 }} />

      {/* --- Cúmulo de premios (izquierda) --- */}
      <Deco
        src={planetaPremios}
        x={-104}
        y={205}
        w={503}
        h={510}
        float={{ amplitude: 7, duration: 6.8, delay: 0.9, rotate: 1.2 }}
      />
      <Deco src={glow} x={-211} y={390} w={883} h={561} />
      <Deco
        src={playstation}
        x={7}
        y={400}
        w={279}
        h={280}
        float={{ amplitude: 11, duration: 4.2, delay: 0.6, rotate: -2 }}
      />
      <Deco
        src={nintendo}
        x={107}
        y={580}
        w={278}
        h={279}
        float={{ amplitude: 9, duration: 5.4, delay: 1.4, drift: 5, rotate: 2 }}
      />
      <Deco
        src={auriculares}
        x={356}
        y={577}
        w={168}
        h={169}
        float={{ amplitude: 12, duration: 3.6, delay: 0.1, rotate: -3 }}
      />

      {/*
        SIN COFRE. Lo pedía el PPT (lám. 29), pero el documento de ajustes del
        cliente lo saca: "se ve el cofre en la pag de inicio, pero en la
        propuesta de diseño no estaba incluido" (pág. 5). El componente
        `TreasureChest` sigue en el proyecto: lo usan /ganaste y /perdiste.
      */}

      {/* --- Bloque central --- */}
      <Deco
        src={logoCodigos}
        x={712}
        y={171}
        w={495}
        h={369}
        glow="0 0 3cqw #09eaff"
        zIndex={4}
        float={{ amplitude: 8, duration: 5.2 }}
      />

      <p
        className="home-desktop__title t-display t-gold abs"
        style={{ ...centeredText(948, 540, 100), zIndex: 5 }}
      >
        Ganá un viaje al Caribe
      </p>

      <p
        className="t-display t-white-glow abs"
        style={{ ...centeredText(960, 662, 50), zIndex: 5 }}
      >
        ¡y cientos de premios más!
      </p>

      <PromoButton
        id="contenido"
        className="home-desktop__cta abs"
        style={{ ...box({ x: 660, y: 759, w: 573, h: 192 }), zIndex: 7 }}
        fontSize={60}
        plate="carga"
        onClick={goParticipar}
      >
        Cargá acá tu código
      </PromoButton>
    </Stage>
  );
}

/* --------------------------------------------------------------------------
   Composición mobile — Figma "landing.png" (402x913).

   Las coordenadas Y son las crudas del frame. El descuento de los 62 px de la
   barra de estado lo hace el contenedor de la rama mobile una sola vez, en
   `components/layout/mobile-stage.css`: acá no se descuenta nada.

   La escena inferior es un bloque de proporción fija: el cúmulo de premios y
   la nave se superponen igual que en el diseño, y cada pieza sigue siendo una
   capa propia para poder flotar por separado.
   -------------------------------------------------------------------------- */
/* Alto de la escena: del borde de arriba del barco (562) al de abajo del glow
   (933), que son la primera y la última capa del cúmulo en el frame. */
const SCENE_H = 371;

function HomeMobile({ onStart }: { onStart: () => void }) {
  return (
    <div
      className="home-m"
      id="contenido"
      data-figma="65:123"
      data-figma-ejes="x,w"
      /* El relleno del frame (#212F5C) es el color base debajo de la foto, que
         lo tapa entera; este div no pinta nada. */
      data-figma-omitir="pintura"
    >
      {/* B3 asomando por la esquina superior derecha, desenfocado y cortado por
          el borde. Está rotado 15.1° en el Figma, así que `figma:check` lo
          compara centro contra centro. */}
      <img
        src={planetaVit2}
        alt=""
        aria-hidden="true"
        className="home-m__b3"
        data-figma="70:180 79:1120"
        fetchPriority="low"
      />

      <LogoCodigos
        className="home-m__logo"
        resplandor="horneado"
        data-figma="70:169 79:1113"
      />

      <div className="mblock">
        {/* El segundo id de cada uno es el del mismo texto en el frame del menú
            desplegado (79:1111), que reusa esta composición: sin él, con el menú
            abierto estas capas quedaban sin nodo y sus resplandores sin control.

            Los dos llevan `omitir="sombras"` porque su resplandor blanco está
            al 20% y el nodo lo declara al 100%. NO es un desvío a corregir: es
            una reducción PEDIDA POR LA CLIENTA el 27-08-2026, anotada al lado
            del valor en `home.css`. Mientras esté, el control no puede avisar
            si alguien cambia esas sombras por error; lo que las cuida es el
            diff de píxeles contra el export.

            El titular suma `trazo-ancho`: el nodo declara 2 px CENTER y el CSS
            pone 1, porque ese número es la entrada al rasterizador de Figma y
            no al de CSS. Se omite SÓLO el ancho — el color del trazo y el orden
            de pintado se siguen controlando. */}
        <p
          className="home-m__title"
          data-figma="70:194 79:1122"
          data-figma-omitir="trazo-ancho,sombras"
        >
          Ganá un viaje al Caribe
        </p>
        <p
          className="home-m__sub"
          data-figma="70:193 79:1121"
          data-figma-omitir="sombras"
        >
          ¡y cientos de premios más!
        </p>
      </div>

      {/* Destello detrás del tablón. En el Figma va encima de los dos textos y
          debajo del botón, así que el CTA lleva su propio apilado. */}
      <img
        src={destello}
        alt=""
        aria-hidden="true"
        className="home-m__flare"
        fetchPriority="low"
        data-figma="70:204"
      />

      <div className="home-m__cta">
        <PromoButton
          plate="carga"
          mobileFontSize={30}
          onClick={onStart}
          data-figma="70:202 79:1124"
          data-figma-label="70:197"
        >
          Cargá acá tu código
        </PromoButton>
      </div>

      {/* Cúmulo de premios (izquierda, sangra) + nave pirata (derecha, sangra).
          Las seis cajas salen de `figma/spec/inicio-mobile.md`, con la y del
          frame menos los 562 en que arranca la escena. */}
      <MobileScene height={SCENE_H} className="home-m__scene">
        {/* El orden es el del frame: planeta premios → glow → auriculares →
            playstation → nintendo → barco. El glow va ENCIMA del planeta y los
            auriculares DEBAJO de la consola. */}
        <FloatingLayer amplitude={6} duration={6.8} delay={0.9} rotate={1.2}
          className="mabs" style={mbox({ x: -83, y: 8, w: 282, h: 286, sceneH: SCENE_H })}
          data-figma="70:171">
          <img src={planetaPremios} alt="" aria-hidden="true" className="mlayer-img" fetchPriority="low" />
        </FloatingLayer>

        <img
          src={glow}
          alt=""
          aria-hidden="true"
          className="mabs mlayer-img home-m__glow"
          fetchPriority="low"
          style={mbox({ x: -65, y: 110, w: 411, h: 261, sceneH: SCENE_H })}
          data-figma="70:173"
        />

        <FloatingLayer amplitude={10} duration={3.6} delay={0.1} rotate={-3}
          className="mabs" style={mbox({ x: 199, y: 197, w: 78, h: 78, sceneH: SCENE_H })}
          data-figma="70:174">
          <img src={auricularesMobile} alt="" aria-hidden="true" className="mlayer-img" fetchPriority="low" />
        </FloatingLayer>

        <FloatingLayer amplitude={9} duration={4.2} delay={0.6} rotate={-2}
          className="mabs" style={mbox({ x: 36, y: 115, w: 130, h: 130, sceneH: SCENE_H })}
          data-figma="70:175">
          <img src={playstationConsola} alt="" aria-hidden="true" className="mlayer-img" fetchPriority="low" />
        </FloatingLayer>

        <FloatingLayer amplitude={8} duration={5.4} delay={1.4} drift={4} rotate={2}
          className="mabs" style={mbox({ x: 83, y: 198, w: 129, h: 130, sceneH: SCENE_H })}
          data-figma="70:176">
          <img src={nintendo} alt="" aria-hidden="true" className="mlayer-img" fetchPriority="low" />
        </FloatingLayer>

        {/* El halo del barco va en su propia capa, quieta. El `drop-shadow` de
            250 px sobre el barco —que entra navegando y después flota— costaba
            tres de cada cuatro cuadros; acá se rasteriza una vez. No lleva
            marca: el nodo `barco 1` es el barco, que va encima. */}
        <img
          src={barco}
          alt=""
          aria-hidden="true"
          className="mabs home-m__ship-halo"
          fetchPriority="low"
          /* Marcado con el MISMO nodo que la nave. No es un duplicado inútil:
             la nave lleva `omitir="sombras"` porque el resplandor no vive en
             ella, y esta capa es la que sí lo dibuja. Entre las dos cubren el
             nodo entero, y cada una aporta su fila a la tabla de `figma:check`.
             Antes esta capa no tenía marca y el resplandor de 250 px --el
             efecto más grande de la pantalla-- no lo comprobaba nadie.
             El segundo id es el del mismo barco en el frame del menú
             desplegado, que reusa esta composición. */
          data-figma="70:178 79:1119"
          data-figma-omitir="pintura"
          style={mbox({ x: 199, y: 0, w: 401, h: 275, sceneH: SCENE_H })}
        />

        <PurosolShip
          variant="enter"
          className="mabs home-m__ship"
          style={mbox({ x: 199, y: 0, w: 401, h: 275, sceneH: SCENE_H })}
          data-figma="70:178 79:1119"
          /* El resplandor del nodo existe y está con su valor exacto, pero vive
             en `.home-m__ship-halo`, la capa quieta de acá arriba: sobre este
             elemento —que se anima— costaba 40 ms por cuadro. El control de
             pintura mira este elemento, así que hay que sacarlo de ahí. Si
             alguna vez se borra esa capa, el halo desaparece sin que el check
             avise: van juntas. Se omiten SÓLO las sombras: el resto de la
             pintura de esta capa se sigue controlando. */
          data-figma-omitir="sombras"
          prioridad="low"
        />
      </MobileScene>
    </div>
  );
}
