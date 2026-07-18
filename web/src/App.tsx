import { useEffect, useState } from 'react';
import { Dashboard } from './pages/Dashboard';
import { About } from './pages/About';

type Route = 'dashboard' | 'about';
type Theme = 'light' | 'dark';

function routeFromHash(): Route {
  return window.location.hash.replace(/^#\/?/, '') === 'about' ? 'about' : 'dashboard';
}

/** Resolve the initial theme: stored preference, else the OS setting. */
function initialTheme(): Theme {
  const stored = localStorage.getItem('oz-theme');
  if (stored === 'light' || stored === 'dark') return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function BrandMark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path
          d="M12 2 4 6v6c0 5 3.5 8 8 10 4.5-2 8-5 8-10V6l-8-4Z"
          fill="currentColor"
          opacity="0.9"
        />
        <path d="m8.5 12 2.5 2.5 4.5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </span>
  );
}

export function App() {
  const [route, setRoute] = useState<Route>(routeFromHash());
  const [theme, setTheme] = useState<Theme>(initialTheme());

  useEffect(() => {
    const onHash = () => setRoute(routeFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('oz-theme', theme);
  }, [theme]);

  return (
    <div className="app">
      <header className="app-header">
        <a className="brand" href="#/">
          <BrandMark />
          OzWizard
        </a>
        <nav className="nav">
          <a className={`nav-link ${route === 'dashboard' ? 'active' : ''}`} href="#/">
            Dashboard
          </a>
          <a className={`nav-link ${route === 'about' ? 'active' : ''}`} href="#/about">
            About
          </a>
          <button
            className="icon-btn"
            type="button"
            onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
            title="Toggle theme"
          >
            {theme === 'dark' ? '☀' : '☾'}
          </button>
        </nav>
      </header>

      <main>{route === 'about' ? <About /> : <Dashboard />}</main>

      <footer className="footer">
        <div>
          Built by{' '}
          <a href="https://chenfeldman.io" target="_blank" rel="noreferrer">
            Chen Feldman
          </a>{' '}
          · Lead By Nature ·{' '}
          <a href="https://chenfeldman.io" target="_blank" rel="noreferrer">
            chenfeldman.io
          </a>
        </div>
        <div className="demo-note">
          Educational / demo material — provided as is. See the repo for details.
        </div>
      </footer>
    </div>
  );
}
