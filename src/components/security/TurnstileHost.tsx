import { useEffect, useRef, useState } from 'react';
import { isTurnstileEnabled, mountTurnstile, unmountTurnstile } from '../../services/turnstile';
import './turnstile-host.css';

/**
 * Contenedor ÚNICO del widget de Cloudflare Turnstile.
 *
 * Se renderiza una sola vez en `App.tsx`, fuera de `Routes`, así que sobrevive
 * a Participar → Registro → resultado y el desafío que arrancó al cargar la
 * página sigue valiendo cuando la persona termina el formulario.
 *
 * No va dentro de los pergaminos a propósito: si Cloudflare pide un click, el
 * widget aparecería dentro del formulario y correría el botón, rompiendo la
 * composición medida contra el Figma. Acá aparece en la esquina, fijo.
 *
 * Sin `data-figma`: `figma:check` sólo compara capas marcadas.
 *
 * Con `VITE_TURNSTILE_SITE_KEY` vacía no renderiza nada (demo con mock).
 */
export function TurnstileHost() {
  const ref = useRef<HTMLDivElement>(null);
  const [interactive, setInteractive] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!isTurnstileEnabled() || !el) return;
    mountTurnstile(el, {
      onInteractiveStart: () => setInteractive(true),
      onInteractiveEnd: () => setInteractive(false),
    });
    // StrictMode (dev) monta → desmonta → monta: el servicio tolera el par.
    return () => unmountTurnstile();
  }, []);

  if (!isTurnstileEnabled()) return null;

  return (
    <>
      {/* Turnstile mete su iframe acá adentro: React no debe renderizar hijos
          en este nodo, sólo tocarle la clase. */}
      <div
        ref={ref}
        className={`turnstile-host${interactive ? ' turnstile-host--interactive' : ''}`}
      />
      {/* Aviso para lectores de pantalla: el checkbox aparece en una esquina
          sin relación con el formulario, así que se anuncia cuando sale. */}
      <p className="sr-only" role="status">
        {interactive ? 'Verificación de seguridad: marcá la casilla que aparece abajo a la derecha.' : ''}
      </p>
    </>
  );
}
