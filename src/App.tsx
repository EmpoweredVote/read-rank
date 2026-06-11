import { BrowserRouter, Routes, Route, useSearchParams } from 'react-router-dom';
import { useEffect } from 'react';
import { Header } from '@empoweredvote/ev-ui';
import { PhaseContainer } from './components/PhaseContainer';
import { DevHelper } from './components/DevHelper';
import { CandidateAlignmentPage } from './components/CandidateAlignmentPage';
import { useAuthState } from './hooks/useAuthState';
import { useReadRankStore } from './store/useReadRankStore';
import { searchPoliticians } from './data/api';
import { extractHashToken, AUTH_HUB_URL } from './lib/auth';
import { ThemeProvider, useTheme } from './ThemeProvider';

function ThemeToggle() {
  const { isDark, toggle } = useTheme();
  return (
    <button
      type="button"
      onClick={toggle}
      className="theme-toggle-btn"
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Light mode' : 'Dark mode'}
    >
      {isDark ? (
        // Sun
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
        </svg>
      ) : (
        // Moon
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  );
}

function MainApp() {
  const { isLoggedIn, userName, loading, logout } = useAuthState();
  const { reset, setLocationFilter, phase } = useReadRankStore();
  const { isDark } = useTheme();

  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    // Extract token from hash fragment on initial load (Auth Hub redirect)
    extractHashToken();

    const address = searchParams.get('address');
    if (!address) return;
    const decoded = decodeURIComponent(address);
    // Strip param immediately to avoid re-processing
    setSearchParams(prev => {
      prev.delete('address');
      return prev;
    }, { replace: true });
    // Search for politicians and apply filter
    searchPoliticians(decoded).then(result => {
      if (result.data.length > 0) {
        setLocationFilter({
          address: decoded,
          politicianIds: result.data.map(p => p.id),
        });
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount only

  const handleClearReadRank = () => {
    if (!window.confirm("Clear all your Read & Rank progress? This can't be undone.")) return;
    reset();
  };

  const profileMenu = loading
    ? undefined
    : isLoggedIn
      ? {
          label: userName || 'Account',
          items: [
            { label: 'Clear Read & Rank', onClick: handleClearReadRank },
            { label: 'Sign out', onClick: logout },
          ],
        }
      : { label: 'Account', items: [{ label: 'Sign in', href: `${AUTH_HUB_URL}/login?redirect=${encodeURIComponent(window.location.href)}` }] };

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--surface-page)' }}>
      <Header
        logoSrc={`${import.meta.env.BASE_URL}EVLogo.svg`}
        logoHref="https://empowered.vote"
        navItems={[]}
        darkMode={isDark}
        profileMenu={profileMenu}
        secondaryAction={<ThemeToggle />}
        onNavigate={(href) => { window.location.href = href; }}
      />
      <DevHelper />
      <main className={phase === 'hub' ? undefined : 'container mx-auto px-4 py-8 max-w-4xl'}>
        <PhaseContainer />
      </main>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter basename="/">
        <Routes>
          <Route path="/" element={<MainApp />} />
          <Route path="/candidate/:candidateId/alignment" element={<CandidateAlignmentPage />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
