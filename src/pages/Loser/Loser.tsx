import { ResultLayout } from '../../components/promo/ResultLayout';
import { ClosedChestMobile } from '../../components/promo/ClosedChestMobile';
import { TreasureChest } from '../../components/promo/TreasureChest';
import { useSession } from '../../app/SessionContext';
import { box } from '../../app/stage';

/** PERDISTE — Figma 23:3159. El cofre queda cerrado, con un balanceo sutil. */
export default function Loser() {
  const { lastResult, codeCount } = useSession();

  return (
    <ResultLayout
      pageTitle="Estuviste cerca"
      title="Estuviste cerca"
      titleSize={140}
      titleTone="outline"
      desktopTitleVariant="loser"
      desktopLeftCometX={-90}
      titleY={463}
      message={['¡Seguí participando, cada código', 'te acerca más al tesoro galáctico!']}
      messageSize={40}
      messageWidth={471}
      messageY={616}
      ctaY={730}
      code={lastResult?.code}
      codeCount={codeCount}
      scene={
        <TreasureChest
          mode="idle"
          style={{ ...box({ x: 1161, y: 490, w: 444, h: 444 }), zIndex: 5 }}
        />
      }
      mobileScene={<ClosedChestMobile />}
    />
  );
}
