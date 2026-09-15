import { useCallback, useEffect, useMemo, useState } from 'react';
import { Stage } from '../../components/layout/Stage';
import { Deco } from '../../components/layout/Deco';
import { PrizeCarousel } from '../../components/promo/PrizeCarousel';
import { promoApi } from '../../services/promoApi';
import { centeredText } from '../../app/stage';
import type { Prize } from '../../types/promo';
import { MOBILE_PRIZE_IMAGES } from './mobile-prize-images';
import './prizes.css';

import { LogoCodigos } from '../../components/promo/LogoCodigos';
import logoCodigos from '../../assets/logos/codigos-secretos.webp';
import fondoPremiosDesktop from '../../assets/backgrounds/fondo-premios-desktop.png';

/** PREMIOS — Figma 57:86. El catálogo llega de `promoApi.getPrizes()`. */
export default function Prizes() {
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [activeName, setActiveName] = useState('');

  useEffect(() => {
    let alive = true;
    promoApi.getPrizes().then((list) => {
      if (!alive) return;
      setPrizes(list);
      setActiveName(list[0]?.name ?? '');
    });
    return () => {
      alive = false;
    };
  }, []);

  const onActiveChange = useCallback((prize: Prize) => setActiveName(prize.name), []);

  /* La página de Premios mobile usa los originales PNG transparentes enviados
     por el cliente. El catálogo compartido queda intacto para desktop, Ganaste
     y cualquier otra pantalla que consuma estos premios. */
  const mobilePrizes = useMemo(
    () =>
      prizes.map((prize) => {
        const image = MOBILE_PRIZE_IMAGES[String(prize.id)];
        return image ? { ...prize, image, thumb: image } : prize;
      }),
    [prizes],
  );

  const carousel = <PrizeCarousel prizes={prizes} onActiveChange={onActiveChange} />;

  return (
    <Stage
      title="Premios"
      mobileBg="halo"
      mobileCielo={{ nodo: '73:672', x: -46, y: -38, w: 493, h: 1070 }}
      mobile={
        /* Figma "Premios.png": logo → carrusel con flechas → nombre del premio
           → tira de miniaturas. El carrusel ya trae swipe y flechas. */
        <div
          className="prizes-m"
          id="contenido"
          data-figma="73:671"
          data-figma-ejes="x,w"
          data-figma-omitir="pintura"
        >
          <LogoCodigos className="prizes-m__logo" data-figma="73:732" />
          <PrizeCarousel
            prizes={mobilePrizes}
            onActiveChange={onActiveChange}
            withThumbs
            caption={activeName}
            nodos={{
              flechaIzq: '73:739',
              flechaDer: '73:741',
              premio: '73:743',
              nombre: '73:745',
              miniActiva: '73:752',
              miniIzq2: '73:747',
              miniIzq1: '73:748',
              miniDer1: '73:750',
            }}
          />
        </div>
      }
    >
      {/* En Figma el planeta, el portal y la Vía Láctea forman parte de la
          misma capa `fondo inicio 1` (57:87), no son objetos separados. */}
      <img
        src={fondoPremiosDesktop}
        alt=""
        aria-hidden="true"
        className="prizes__background"
      />

      <Deco src={logoCodigos} x={685} y={117} w={523} h={390} zIndex={4}
        glow="0 0 2.8cqw #09eaff" float={{ amplitude: 7, duration: 5.4 }} />

      <div id="contenido">{carousel}</div>

      <p className="t-display t-white-glow prizes__name abs" style={{ ...centeredText(959, 923, 80), zIndex: 6 }}>
        {activeName}
      </p>
    </Stage>
  );
}
