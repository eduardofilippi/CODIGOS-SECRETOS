import { Suspense, lazy, useEffect } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { SessionProvider } from './app/SessionContext';
import { ScenarioSwitcher } from './components/dev/ScenarioSwitcher';
import { TurnstileHost } from './components/security/TurnstileHost';
import cursorAnchor from './assets/ui/cursor-ancla-32.png';

/**
 * Todas las pantallas salvo el Home entran por lazy-load: la carga inicial sólo
 * arrastra el KV, el logo y el cofre.
 */
import Home from './pages/Home/Home';

const Welcome = lazy(() => import('./pages/Welcome/Welcome'));
const Register = lazy(() => import('./pages/Register/Register'));
const Prizes = lazy(() => import('./pages/Prizes/Prizes'));
const CodeHelp = lazy(() => import('./pages/CodeHelp/CodeHelp'));
const Terms = lazy(() => import('./pages/Terms/Terms'));
const Winner = lazy(() => import('./pages/Winner/Winner'));
const Loser = lazy(() => import('./pages/Loser/Loser'));
const CodeUsed = lazy(() => import('./pages/CodeUsed/CodeUsed'));
const CodeNotFound = lazy(() => import('./pages/CodeNotFound/CodeNotFound'));

function Fallback() {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'grid',
        placeItems: 'center',
        background: '#0b1642',
        color: 'var(--c-cyan)',
        fontFamily: 'var(--font-display)',
        fontSize: 'clamp(18px, 2vw, 28px)',
      }}
      role="status"
    >
      Navegando hacia el tesoro…
    </div>
  );
}

export function App() {
  // Cursor ancla propuesto en el PPT. Se aplica sólo con puntero fino (ver global.css).
  useEffect(() => {
    document.documentElement.style.setProperty('--cursor-anchor', `url(${cursorAnchor}) 6 2`);
    document.body.classList.add('cursor-anchor');
    return () => document.body.classList.remove('cursor-anchor');
  }, []);

  return (
    <SessionProvider>
      <HashRouter>
        <a className="skip-link" href="#contenido">
          Saltar al contenido
        </a>
        <Suspense fallback={<Fallback />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/participar" element={<Welcome />} />
            <Route path="/registro" element={<Register />} />
            <Route path="/premios" element={<Prizes />} />
            <Route path="/donde-esta-el-codigo" element={<CodeHelp />} />
            <Route path="/bases" element={<Terms />} />
            <Route path="/ganaste" element={<Winner />} />
            <Route path="/perdiste" element={<Loser />} />
            <Route path="/codigo-utilizado" element={<CodeUsed />} />
            <Route path="/codigo-inexistente" element={<CodeNotFound />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
        <ScenarioSwitcher />
        {/* Widget anti-bot, uno solo para toda la app; ver el componente. */}
        <TurnstileHost />
      </HashRouter>
    </SessionProvider>
  );
}
