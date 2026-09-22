import { useLayoutEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Stage } from '../layout/Stage';
import { Deco } from '../layout/Deco';
import { PromoButton } from '../buttons/PromoButton';
import { CloseButton } from '../navigation/CloseButton';
import { CodeCounter } from './CodeCounter';
import { box, centeredText, u } from '../../app/stage';
import './result-layout.css';

import { LogoCodigos } from './LogoCodigos';
import logoCodigosResultDesktop from '../../assets/logos/codigos-secretos-result-desktop.png';
import logoPurosolResultDesktop from '../../assets/logos/purosol-result-desktop.png';
import destello from '../../assets/effects/destello.webp';
import planetaVit1 from '../../assets/planets/planeta-vit-1.webp';
import planetaVit2 from '../../assets/planets/planeta-vit-2.webp';

export interface ResultLayoutProps {
  title: string;
  /** Tamaño del titular en px de diseño. */
  titleSize?: number;
  /**
   * Cuerpo del titular en px del lienzo mobile de 402. Sólo hace falta cuando
   * el texto es más largo que el de la pantalla para la que se calibró el tono
   * y necesita entrar igual en un renglón: «¡Código fuera de órbita!» contra
   * «Estuviste cerca».
   */
  mobileTitleSize?: number;
  /**
   * Corrimiento vertical del titular en mobile, en px del lienzo de 402. Va
   * por `position: relative`, no por margen, para que reubicar el titular no
   * arrastre al resto de la columna.
   */
  mobileTitleShift?: number;
  /** `gold` = GANASTE; `outline` = relleno dorado con contorno rojo (PERDISTE y errores). */
  titleTone?: 'gold' | 'outline';
  /** Variante visual adicional aplicada únicamente al titular de escritorio. */
  desktopTitleVariant?: string;
  /** X del cometa izquierdo, exclusiva de la composición desktop. */
  desktopLeftCometX?: number;
  /** Centro X e Y del titular en coordenadas de diseño. */
  titleX?: number;
  titleY?: number;
  /**
   * Una entrada por renglón. El corte de línea del Figma es intencional, así
   * que se respeta en desktop; en mobile los renglones se unen y fluyen solos.
   */
  message: string[];
  /** Texto alternativo exclusivo de desktop; mobile conserva `message`. */
  desktopMessage?: string[];
  /** En desktop, fuerza que el mensaje de esta pantalla quede en un solo renglón. */
  desktopMessageSingleLine?: boolean;
  messageSize?: number;
  /** Ancho del bloque de mensaje en px de diseño. */
  messageWidth?: number;
  /** Y del mensaje en coordenadas de diseño. */
  messageY?: number;
  /** Y del botón "Cargar otro código". */
  ctaY?: number;
  /** Escena de la derecha: cofre + premio, en coordenadas de diseño. */
  scene: ReactNode;
  code?: string;
  codeCount: number;
  /**
   * Agrega el renglón del teléfono a la píldora. Sólo lo pide GANASTE: es la
   * única pantalla con un premio que reclamar. Ver `TELEFONO`.
   */
  muestraTelefono?: boolean;
  /** Versión mobile de la escena. */
  mobileScene: ReactNode;
  /**
   * Sufijo de clase para las pantallas que se apartan de la caja de PERDISTE,
   * que es contra la que está calibrada la composición. `codigo-utilizado` y
   * `codigo-inexistente` comparten una caja propia: el logo y la X corridos a
   * la izquierda, y el titular y el mensaje con su propia geometría.
   */
  mobileVariante?: string;
  /**
   * Ejes que `figma:check` debe decidir en el mensaje. GANASTE lo usa porque
   * su texto lleva el nombre del premio, que es dinámico: el ancho y la x
   * dependen del catálogo, no del CSS.
   */
  mobileMensajeEjes?: string;
  pageTitle: string;
}

/* Texto de la píldora, pedido por la clienta en «Cuando un código no existe»
   (PDF del 22-09-2026). Reemplaza a «CANJEASTE EL CÓDIGO: … / GUARDÁ TUS
   STICKERS GANADORES PARA CANJEAR TU PREMIO».

   Va en UN SOLO renglón lógico, como lo mandó el PDF: partido en dos párrafos
   la píldora de escritorio daba seis renglones y se salía del lienzo. */
const SEGUI_CARGANDO =
  '¡SEGUÍ CARGANDO CÓDIGOS PARA PARTICIPAR POR MÁS PREMIOS INSTANTÁNEOS Y AUMENTAR TUS CHANCES DE GANAR EL VIAJE AL CARIBE! RECORDÁ GUARDAR TUS STICKERS.';

/* El teléfono queda SÓLO en GANASTE. El PDF marca las otras tres pantallas
   —perdiste, código utilizado, código inexistente— y en el reemplazo no lo
   incluye: ahí no hay ningún premio que retirar, así que el número sobraba. */
const TELEFONO = '¡COMUNICATE AL +595 984 324 335 PARA RETIRARLO!';

/**
 * Estructura común de las cuatro pantallas de resultado
 * (23:3081 GANASTE, 23:3159 PERDISTE, 107:297 y 131:131).
 *
 * La navegación queda siempre plegada: el foco es el resultado.
 */
export function ResultLayout({
  title,
  titleSize = 121,
  mobileTitleSize,
  mobileTitleShift,
  titleTone = 'gold',
  desktopTitleVariant,
  desktopLeftCometX = 1,
  titleX = 479,
  titleY = 463,
  message,
  desktopMessage,
  desktopMessageSingleLine = false,
  messageSize = 34,
  messageWidth = 760,
  messageY = 613,
  ctaY = 711,
  scene,
  code,
  codeCount,
  muestraTelefono = false,
  mobileScene,
  mobileVariante,
  mobileMensajeEjes,
  pageTitle,
}: ResultLayoutProps) {
  const navigate = useNavigate();
  const reload = () => navigate('/participar');
  const desktopMessageRef = useRef<HTMLParagraphElement>(null);
  const desktopMessageText = (desktopMessage ?? message).join(' ');

  /* GANASTE admite nombres de longitud variable. En desktop se conserva el
     cuerpo del Figma siempre que entra; si un premio es más largo, se mide la
     tinta real con DK Prince Frog y se reduce sólo ese renglón. La rama mobile
     usa otro elemento (`result-m__msg`) y nunca pasa por este ajuste. */
  useLayoutEffect(() => {
    if (!desktopMessageSingleLine) return;

    const element = desktopMessageRef.current;
    if (!element) return;

    const desktop = window.matchMedia('(min-width: 900px)');
    const fit = () => {
      element.style.fontSize = u(messageSize);
      if (!desktop.matches) return;

      const available = element.clientWidth;
      const required = element.scrollWidth;
      if (!available || required <= available) return;

      const baseSize = Number.parseFloat(window.getComputedStyle(element).fontSize);
      element.style.fontSize = `${baseSize * (available / required)}px`;
    };

    fit();
    void document.fonts.ready.then(fit);
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, [desktopMessageSingleLine, desktopMessageText, messageSize, messageWidth]);

  const note = (
    <>
      {code && (
        <p className="result__note-code">
          INGRESASTE EL CÓDIGO <strong>{code}</strong>.
        </p>
      )}
      <p>{SEGUI_CARGANDO}</p>
      {muestraTelefono && <p>{TELEFONO}</p>}
    </>
  );

  return (
    <Stage
      title={pageTitle}
      compactMenu
      desktopClassName="result-stage"
      desktopMenuLogo={logoPurosolResultDesktop}
      mobileBg="profundo"
      /* Los cuatro frames de resultado miden 969 y no 913. De este número sale
         el alto útil contra el que la rama mobile calcula su escala: con el 913
         por defecto estas cuatro se dibujarían un 6% más chicas de lo que les
         corresponde en cualquier teléfono donde mande el eje vertical. */
      mobileAlto={969}
      /* `CODIGO 1`, el encuadre de la foto de fondo: (-22, -38) 445x965, uno por
         frame. Faltaba —lo detectó el reporte inverso de `figma:check`, que lo
         listaba como «sin implementar o sin marcar» en las cuatro—, así que la
         foto se recortaba con `object-fit: cover` sobre el viewport en vez de
         ir al encuadre del diseño, y nada lo comparaba con nada. */
      mobileCielo={{ nodo: '74:1026 73:859 105:261 131:333', x: -22, y: -38, w: 445, h: 965 }}
      mobile={
        /* Composición mobile de las cuatro pantallas de resultado
           (ganaste / perdiste / codigo utilizado / codigo utilizado-1, 402x969).
           Orden del Figma: logo → titular → mensaje → botón → píldora con el
           código → escena del cofre → contador.

           Cada `data-figma` de acá abajo lista los CUATRO nodos del mismo
           elemento, uno por frame, siempre en este orden:

             perdiste · ganaste · codigo-utilizado · codigo-inexistente

           `figma:check` usa el que exista en el spec de la pantalla que está
           midiendo y marca los otros «pertenece a otro frame», sin contarlos
           como falla.

           La geometría se calibró contra `perdiste`, que comparte caja con
           codigo-utilizado y codigo-inexistente. `ganaste` se aparta —su
           titular es más alto y corre el botón y la píldora— y por eso sus
           corrimientos NO viven acá: van en su propia clase. */
        <div
          className={`result-m result-m--${titleTone}${
            mobileVariante ? ` result-m--${mobileVariante}` : ''
          }`}
          id="contenido"
          data-figma="74:1025 73:858 105:260 131:332"
          data-figma-ejes="x,w"
          /* El relleno del frame va debajo de la foto, que lo tapa entera;
             este div no pinta nada. Igual que en landing y registro. */
          data-figma-omitir="pintura"
          style={
            {
              ...(mobileTitleSize
                ? { '--result-m-title': `${(mobileTitleSize / 4.02).toFixed(3)}cqw` }
                : {}),
              ...(mobileTitleShift
                ? { '--result-m-title-shift': `${(mobileTitleShift / 4.02).toFixed(3)}cqw` }
                : {}),
            } as CSSProperties
          }
        >
          {/* Superficie del planeta a nivel de pantalla: en el Figma llega hasta
              el borde inferior y el contador se apoya encima. Dentro de la
              escena del cofre quedaba recortada y aparecía una franja de cielo
              entre el cofre y el contador. */}
          <div className="result-m__planet-clip" aria-hidden="true">
            <div
              className="result-m__planet"
              data-figma="74:1030 73:866 105:265 131:337"
            />
          </div>

          {/* La mecánica (láminas 3 y 6) pide que la X vuelva a la carga de
              código, igual que el botón: el objetivo es seguir participando. */}
          <CloseButton
            to="/participar"
            className="result-m__close"
            data-figma="107:174 107:164 107:182 131:352"
          />

          {/* HORNEADO, como INICIO y PARTICIPAR. Con la variante `css` este
              logo lleva `drop-shadow(0 0 125px)` sobre una caja de 173x129, y
              eso en Safari de iPhone obliga a un búfer aparte que se dibuja
              recortado: el borde de ese recorte es el cuadro tenue que reportó
              la clienta alrededor del logo. En WebKit headless es peor todavía
              —el logo directamente NO SE DIBUJA—, mientras que en Chromium sale
              bien, que es la firma de siempre de este defecto.

              Horneado no hay desenfoque en tiempo de ejecución: no hay búfer, no
              hay recorte y no hay cuadro. Las cuatro pantallas de resultado
              comparten este componente y el mismo nodo, así que se arregla una
              vez para las cuatro. */}
          <LogoCodigos
            className="result-m__logo"
            resplandor="horneado"
            halo="resultado"
            data-figma="74:1027 73:860 105:262 131:334"
          />

          {/* El ancho del trazo se omite SÓLO en el dorado de GANASTE, que va a
              1 px contra los 2 del nodo 74:987 —ver la medición en
              `result-layout.css`—. Los tres titulares con contorno rojo se
              quedan en 2 px porque ahí el número del nodo SÍ es el que más se
              acerca al export, así que su ancho se sigue controlando. */}
          <p
            className={`result-m__title result-m__title--${titleTone}`}
            data-figma="74:1107 74:987 105:278 131:350"
            /* Los dos tonos van a 1 px contra los 2 px del nodo, así que los
               dos omiten `trazo-ancho`. El de contorno rojo omite además las
               sombras, porque su blanco va al 20%; el dorado conserva su
               resplandor al 100% y por eso no las omite. */
            data-figma-omitir={
              titleTone === 'gold' ? 'trazo-ancho' : 'trazo-ancho,sombras'
            }
          >
            {title}
          </p>

          {/* Cada entrada es un renglón del diseño y se respeta también en
              mobile: los exports cortan justo ahí. Siguen siendo bloques que
              fluyen, así que en un teléfono angosto cada uno se parte solo. */}
          <p
            className="result-m__msg"
            data-figma="74:1109 74:988 105:279 131:351"
            /* `omitir="sombras"`: el resplandor blanco va al 20% y el nodo lo declara
          al 100%. NO es un desvío a corregir: es la reducción pedida por la
          clienta el 27-08-2026, replicada desde HOME por consistencia y
          anotada al lado del valor en el CSS. Mientras esté, el control no
          avisa si alguien toca esas sombras por error. */
            data-figma-omitir="sombras"
            data-figma-ejes={mobileMensajeEjes}
          >
            {message.map((line) => (
              <span key={line} className="result-m__msg-line">
                {line}
              </span>
            ))}
          </p>

          <div className="result-m__cta">
            <PromoButton
              mobileFontSize={30}
              onClick={reload}
              data-figma="74:1034 74:1001 105:267 131:339"
              data-figma-label="74:1035 74:1003 105:268 131:340"
            >
              Cargar otro código
            </PromoButton>
          </div>

          {/* En el diseño la píldora son dos capas: `Rectangle 1`, la superficie
              con su radio, y el texto adentro. Acá también, para que las dos se
              puedan medir.

              DESVÍO INTENCIONAL — la clienta cambió el texto de la píldora
              por uno más largo («¡SEGUÍ CARGANDO CÓDIGOS…!», ver
              `SEGUI_CARGANDO`), así que el texto ya no cabe en los 257 de su
              nodo: ocupa todo el ancho útil de la píldora y da -28x +56w, o
              sea el mismo centro con la caja más ancha.

              La SUPERFICIE, en cambio, volvió a los 313x51 del nodo cuando el
              PDF del 22-09-2026 sacó el renglón del teléfono: medido con
              `figma:check` en perdiste-mobile, `Rectangle 1` ya no aparece
              entre los desvíos y el texto queda en +1.5h. GANASTE es la única
              que conserva el teléfono (`muestraTelefono`) y por eso su píldora
              sigue siendo un renglón más alta que las otras tres. */}
          <div
            className="result-m__note"
            data-figma="74:1041 74:991 105:270 131:342"
          >
            <div
              className="result-m__note-text"
              data-figma="74:1042 74:992 105:271 131:343"
            >
              {note}
            </div>
          </div>

          {/* La escena es un contenedor del código: en el Figma el cofre y el
              premio cuelgan del frame, sin un grupo que los envuelva. */}
          <div className="result-m__scene">{mobileScene}</div>

          <CodeCounter
            count={codeCount}
            className="result-m__counter"
            data-figma="74:1044 74:1022 105:273 131:345"
            data-figma-label="74:1047 74:1018 105:276 131:348"
            /* El trazo del rótulo va a 0,5 px contra el 1 px del nodo: con
               1 px la proporción trazo/relleno daba 2,33 contra 0,30 del
               export, o sea 7,81 veces más grueso, el peor caso del
               proyecto. El porqué está en `result-layout.css`. Se omite
               SÓLO el ancho; el color del trazo se sigue controlando. */
            data-figma-label-omitir="trazo-ancho"
          />
        </div>
      }
    >
      {/* Oscurecimiento de la mitad izquierda: en el Figma la columna de texto
          se apoya sobre un cielo mucho más oscuro que el de la derecha (hasta
          66 puntos de luminancia menos sobre el borde izquierdo). Sin esto el
          titular y el mensaje pierden contraste contra el fondo. */}
      <div className="result__vignette abs" style={{ zIndex: 0 }} />

      {/* --- Universo --- */}
      <Deco src={destello} x={desktopLeftCometX} y={155} w={415} h={275} opacity={0.5}
        float={{ amplitude: 9, duration: 5.2 }} />
      <Deco src={destello} x={713} y={40} w={297} h={197}
        float={{ amplitude: 7, duration: 4.4, delay: 0.7 }} />
      <Deco src={destello} x={1554} y={438} w={385} h={255}
        float={{ amplitude: 10, duration: 6, delay: 1.3 }} />
      <Deco src={planetaVit1} x={842} y={-57} w={253} h={124} blur={5} opacity={0.9}
        float={{ amplitude: 5, duration: 6.6, drift: 4 }} />
      <Deco src={planetaVit2} x={1811} y={146} w={169} h={184} rotate={15.05} blur={5} opacity={0.8}
        float={{ amplitude: 6, duration: 7, delay: 0.9 }} />

      <div className="result__right-group abs">
      {/* Superficie del planeta sobre la que se apoya el cofre.
          Geometría exacta de la elipse del Figma: nodo 23:3092 en GANASTE y
          23:3161 en PERDISTE, los dos [889, 794, 951, 911]. Antes era una
          circunferencia de 969 ajustada por medición sobre los PNG, 58 px más
          alta y 18 más ancha que el diseño; el PDF lo marca en las páginas 10
          y 11 ("replicar el planeta y el tamaño como en la propuesta"). */}
      <div className="result__planet abs" style={{ ...box({ x: 889, y: 794, w: 951, h: 911 }), zIndex: 1 }} />

      {/* --- Escena (cofre / premio) --- */}
      {scene}

      <CodeCounter
        className="abs"
        count={codeCount}
        /* Nodo 64:111 / 64:117: la placa arranca en (1168, 940). */
        style={{ left: u(1168), top: u(940), zIndex: 7 }}
      />
      </div>

      <div className="result__left-group abs">

      <Deco src={logoCodigosResultDesktop} x={299} y={202} w={329} h={245} zIndex={4}
        glow="0 0 2.4cqw #09eaff" float={{ amplitude: 6, duration: 5 }} />

      {/* --- Columna de texto --- */}
      <p
        className={`t-display result__title result__title--${titleTone}${
          desktopTitleVariant ? ` result__title--${desktopTitleVariant}` : ''
        } abs`}
        style={{ ...centeredText(titleX, titleY, titleSize), zIndex: 6 }}
      >
        {title}
      </p>

      <p
        ref={desktopMessageRef}
        className={`t-display t-white-glow result__message abs${
          desktopMessageSingleLine ? ' result__message--single-line' : ''
        }`}
        style={{
          left: u(480),
          top: u(messageY),
          fontSize: u(messageSize),
          width: u(messageWidth),
          transform: 'translateX(-50%)',
          zIndex: 6,
        }}
      >
        {(desktopMessage ?? message).map((line, i) => (
          <span key={line} className="result__message-line">
            {i > 0 && ' '}
            {line}
          </span>
        ))}
      </p>

      <PromoButton
        id="contenido"
        className="abs"
        style={{ ...box({ x: 276, y: ctaY, w: 375, h: 125 }), zIndex: 7 }}
        /* 48 y no 50: el botón mide 375 y el rótulo lleva `padding: 0 30px`, o
           sea 315 px útiles. A 50 el texto necesita EXACTAMENTE 315 y cae al
           límite: «código» se iba al segundo renglón en las tres pantallas de
           error. A 48 necesita 302 y entra con margen. Medido en el navegador
           a 1920. Es sólo la composición de escritorio; el botón mobile es otro
           elemento y no se toca. */
        fontSize={48}
        onClick={reload}
      >
        Cargar otro código
      </PromoButton>

      {/* --- Pie: aviso de stickers y contador --- */}
      {/* Alto mínimo y no fijo: con el texto nuevo (14-09-2026) son cinco
          renglones y la píldora crece hacia abajo desde la y del nodo. */}
      <div
        className="result__note abs"
        style={{ ...box({ x: 150, y: 896, w: 630, h: 97 }), height: 'auto', minHeight: u(97), zIndex: 7 }}
      >
        {note}
      </div>
      </div>

      <CloseButton
        to="/participar"
        className="result__close"
        style={{ left: u(1737), top: u(34) }}
      />
    </Stage>
  );
}
