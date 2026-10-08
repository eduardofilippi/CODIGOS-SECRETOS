import { Stage } from '../../components/layout/Stage';
import { Deco } from '../../components/layout/Deco';
import { PurosolShip } from '../../components/promo/PurosolShip';
import { TelescopeMagnifier } from '../../components/promo/TelescopeMagnifier';
import { CloseButton } from '../../components/navigation/CloseButton';
import { box, u } from '../../app/stage';
import './code-help.css';

import { LogoCodigos } from '../../components/promo/LogoCodigos';
import logoCodigosDesktop from '../../assets/logos/codigos-secretos-codehelp-desktop.png';
import jugos from '../../assets/promo/jugos.webp';
import portal from '../../assets/planets/portal.webp';
import portalDesktop from '../../assets/planets/portal-codehelp-desktop.png';
import destello from '../../assets/effects/destello.webp';
import barco from '../../assets/promo/barco.webp';
import barcoDesktop from '../../assets/promo/barco-codehelp-desktop.png';
import planetaVit1 from '../../assets/planets/planeta-vit-1.webp';
import planetaVit2 from '../../assets/planets/planeta-vit-2.webp';
import planetaCodigoDesktop from '../../assets/planets/codehelp-ellipse-desktop.svg';
import fondoCodigoDesktop from '../../assets/backgrounds/fondo-codehelp-desktop.png';

const PACK_ALT =
  'Pack de jugos PuroSol con el sticker promocional. El código secreto está impreso en el sticker, en el frente del envase.';

/* Texto pedido por la clienta en «En el apartado Buscá el código secreto»
   (PDF del 22-09-2026): reemplaza a «GUARDÁ TUS STICKERS GANADORES PARA
   CANJEAR TU PREMIO / ¡COMUNICATE AL …!». Acá no hay código ingresado ni
   premio que retirar, así que va sin el «Ingresaste el código XXX» que sí
   lleva la píldora de las pantallas de resultado, y sin el teléfono. */
const CONTACT = [
  '¡SEGUÍ CARGANDO CÓDIGOS PARA PARTICIPAR POR MÁS PREMIOS INSTANTÁNEOS Y AUMENTAR TUS CHANCES DE GANAR EL VIAJE AL CARIBE! RECORDÁ GUARDAR TUS STICKERS.',
];

/** DÓNDE ESTÁ EL CÓDIGO — Figma 19:2982. */
export default function CodeHelp() {
  const note = (
    <>
      {CONTACT.map((line) => (
        <p key={line}>{line}</p>
      ))}
    </>
  );

  return (
    <Stage
      title="¿Dónde encuentro el código secreto?"
      compactMenu
      desktopBg={fondoCodigoDesktop}
      desktopClassName="stage--codehelp"
      /* PRIORIDAD DE DESCARGA. Nada visual cambia. Medido contra el build
         publicado con la red a 4 Mbps: el fondo, el logo y su halo se descubren
         a los 256 ms porque el `preload` del index.html los alcanza, pero
         `portal`, `barco`, `destello` y `jugos` recién a los 1.147 ms, y
         `portal` --el asset más pesado del build, 276 kB-- terminaba último, a
         2.468 ms. Acá se marca qué va primero. */
      mobileBgPrioridad="high"
      mobileCielo={{ nodo: '73:782', x: -22, y: -38, w: 445, h: 965 }}
      mobile={
        /* Figma "donde esta el codigo" (402x913): cielo claro con horizonte,
           logo → titular dorado a dos renglones → nave completa a la izquierda
           del pack → pack apoyado sobre la superficie del planeta → píldora
           cian de contacto sobre esa superficie. */
        <div
          className="codehelp-m"
          id="contenido"
          data-figma="73:781"
          data-figma-ejes="x,w"
          data-figma-omitir="pintura"
        >
          {/* Portal asomando por el borde superior derecho, con la X encima.
              Está en el Figma de esta vista y faltaba en la composición. */}
          <img
            src={portal}
            alt=""
            aria-hidden="true"
            className="codehelp-m__portal"
            data-figma="73:817"
            /* Alta: es la pieza pesada que define la parte de arriba de la
               composición, y la que llegaba última. */
            fetchPriority="high"
          />

          <CloseButton to="/participar" className="codehelp-m__close" data-figma="99:258" />

          <LogoCodigos className="codehelp-m__logo" data-figma="73:783" />

          {/* El corte de renglón es el del Figma mobile, no uno automático. */}
          {/* `omitir="sombras"`: el resplandor blanco va al 20% y el nodo lo declara
          al 100%. NO es un desvío a corregir: es la reducción pedida por la
          clienta el 27-08-2026, replicada desde HOME por consistencia y
          anotada al lado del valor en el CSS. Mientras esté, el control no
          avisa si alguien toca esas sombras por error. */}
          {/* `omitir` suma `trazo-ancho`: el trazo va a 0,5 px contra el 1 px del nodo. Medida la
          proporción trazo/relleno contra el recorte del export, con 1 px daba
          5,43 veces el del diseño. El tamaño y el color del trazo se siguen controlando: sólo se
          omite el ancho. */}
          <p
            className="codehelp-m__title"
            data-figma="73:827"
            data-figma-omitir="sombras,trazo-ancho"
          >
            Buscá el Código Secreto en
            <br />
            los stickers de Purosol
          </p>

          {/* Superficie oscura sobre la que se apoyan el pack y la píldora. */}
          <div className="codehelp-m__planet" aria-hidden="true" data-figma="73:819" />

          {/* La escena no es un nodo: en el frame el destello, la nave y el
              pack cuelgan sueltos del propio frame. */}
          <div className="codehelp-m__scene">
            {/* Destello detrás del pack, como en el Figma. */}
            <img
              src={destello}
              alt=""
              aria-hidden="true"
              className="codehelp-m__flare"
              data-figma="73:793"
              fetchPriority="low"
            />
            {/* `flipped` es el espejo horizontal del nodo: ver el porqué en
                `code-help.css`, que tiene el detalle de cómo se resolvió. */}
            {/* Marcado con el mismo nodo que la nave: ella omite las sombras
                porque el resplandor no vive ahí, y esta capa es la que lo
                dibuja. */}
            <img
              src={barco}
              alt=""
              aria-hidden="true"
              className="codehelp-m__ship-halo"
              data-figma="73:789"
              data-figma-omitir="pintura"
              fetchPriority="low"
            />
            <PurosolShip
              flipped
              className="codehelp-m__ship"
              prioridad="low"
              data-figma="73:789"
              /* Dos controles que este elemento no puede pasar, los dos por
                 lo mismo: `.ship` lleva la animación de flotación, que escribe
                 `transform`.

                 · sombras — el `0 0 250px #FFFFFF` del nodo vive en
                   `.codehelp-m__ship-halo`, la capa quieta de acá arriba: un
                   desenfoque de 250 px sobre algo que se mueve cuesta cuadros.
                 · espejo — el nodo está espejado y el volteo va en la imagen de
                   adentro (`flipped`), porque acá lo pisaría la animación. */
              data-figma-omitir="sombras,espejo"
            />
            <TelescopeMagnifier
              src={jugos}
              alt={PACK_ALT}
              description={PACK_ALT}
              zoom={2.2}
              data-figma="73:821"
            />
          </div>

          {/* En el frame la píldora son dos capas: `Rectangle 1` (73:824), la
              superficie con su radio, y el texto adentro (73:825). Acá también,
              para que las dos se puedan medir. `Group 3` (73:823) es el grupo
              que las envuelve y tiene la misma caja que la superficie. */}
          <div className="codehelp-m__note" data-figma="73:824">
            <div className="codehelp-m__note-text" data-figma="73:825">
              {note}
            </div>
          </div>
        </div>
      }
    >
      <Deco src={destello} x={-117} y={540} w={415} h={275} opacity={0.5} />
      <Deco src={destello} className="codehelp__right-anchor" x={1603} y={287} w={415} h={275} />
      <Deco src={planetaVit1} x={1073} y={-57} w={339} h={166} blur={5} opacity={0.9} />
      <Deco src={planetaVit2} className="codehelp__right-anchor" x={1828.737} y={160.716} w={133.703} h={154.252} rotate={15.05} blur={5} opacity={0.8} />
      <Deco src={portalDesktop} className="codehelp__left-anchor" x={521} y={733} w={330} h={269} opacity={0.6} zIndex={1} />

      <PurosolShip src={barcoDesktop} flipped className="codehelp__ship codehelp__left-anchor" style={{ ...box({ x: -258, y: 731, w: 664, h: 455 }), zIndex: 3 }} />

      <Deco src={logoCodigosDesktop} className="codehelp__left-anchor" x={129} y={312} w={669} h={499} zIndex={4}
        glow="0 0 3cqw #09eaff" />

      {/* El único planeta oscuro del frame: SVG exacto del nodo 19:3016. */}
      <Deco src={planetaCodigoDesktop} className="codehelp__right-anchor" x={686} y={731} w={1496} h={1277} zIndex={2} />

      <p className="t-display t-gold codehelp__title codehelp__right-anchor abs" style={{ left: u(1410), top: u(176), fontSize: u(60), width: u(558), zIndex: 6 }}>
        <span>Buscá el Código Secreto en</span>
        <span>los stickers de Purosol</span>
      </p>

      <TelescopeMagnifier
        src={jugos}
        alt={PACK_ALT}
        description={PACK_ALT}
        zoom={2.2}
        className="codehelp__pack codehelp__right-anchor"
        style={{ ...box({ x: 1200, y: 157, w: 467, h: 765 }), zIndex: 6 }}
      />

      {/* Alto mínimo y no fijo: el texto del PDF del 22-09-2026 es más largo
          que el del nodo y la píldora crece hacia abajo desde su y de Figma. */}
      <div
        className="codehelp__note codehelp__right-anchor abs"
        style={{ ...box({ x: 1095, y: 935, w: 640, h: 82 }), height: 'auto', minHeight: u(82), zIndex: 7 }}
        id="contenido"
      >
        {note}
      </div>

      <CloseButton to="/participar" className="codehelp__right-anchor" style={{ left: u(1758), top: u(41) }} />
    </Stage>
  );
}
