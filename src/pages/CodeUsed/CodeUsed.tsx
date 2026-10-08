import { ResultLayout } from '../../components/promo/ResultLayout';
import { ClosedChestMobile } from '../../components/promo/ClosedChestMobile';
import { TreasureChest } from '../../components/promo/TreasureChest';
import { useSession } from '../../app/SessionContext';
import { box } from '../../app/stage';

/** CÓDIGO UTILIZADO — Figma 107:297. Estado provisto por el mock/backend. */
export default function CodeUsed() {
  const { lastResult, codeCount } = useSession();

  return (
    <ResultLayout
      pageTitle="Código fuera de órbita"
      title="¡Código fuera de órbita!"
      titleSize={100}
      mobileTitleSize={40}
      mobileVariante="orbita"
      titleTone="outline"
      desktopTitleVariant="error"
      desktopLeftCometX={-90}
      titleX={499}
      titleY={488}
      message={['Este código secreto ya fue activado.', 'Ingresá uno nuevo para seguir avanzando.']}
      messageSize={40}
      messageWidth={577}
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
