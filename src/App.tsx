import { BrowserRouter, Routes, Route, useSearchParams, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { Header, getFeedbackUrl } from '@empoweredvote/ev-ui';
import { track, identify, resetIdentity } from './lib/analytics';
import { PhaseContainer } from './components/PhaseContainer';
import { DevHelper } from './components/DevHelper';
import { CandidateAlignmentPage } from './components/CandidateAlignmentPage';
import { useAuthState } from './hooks/useAuthState';
import { useReadRankStore } from './store/useReadRankStore';
import { searchPoliticians } from './data/api';
import { extractHashToken, AUTH_HUB_URL } from './lib/auth';
import { ThemeProvider, useTheme } from './ThemeProvider';
import { parseStateFromAddress } from './utils/parseStateFromAddress';

// Manual SPA pageview tracking — fires on every route change.
function PostHogPageview() {
  const location = useLocation();
  useEffect(() => {
    track('$pageview');
    return () => track('$pageleave');
  }, [location.pathname]);
  return null;
}

function ThemeToggle() {
  const { isDark, toggle } = useTheme();
  return (
    <button
      type="button"
      onClick={() => { track('readrank_theme_toggled', { to: isDark ? 'light' : 'dark' }); toggle(); }}
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
  const { isLoggedIn, userName, userId, loading, logout } = useAuthState();
  const { reset, setLocationFilter, phase } = useReadRankStore();
  const { isDark } = useTheme();

  const [searchParams, setSearchParams] = useSearchParams();

  // Tie the analytics session to the signed-in user (creates a person profile).
  useEffect(() => {
    if (isLoggedIn && userId) identify(userId);
  }, [isLoggedIn, userId]);

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
          state: parseStateFromAddress(decoded),
          county: result.county?.geoid ?? null,
          countyName: result.county?.name ?? null,
        });
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount only

  const handleClearReadRank = () => {
    if (!window.confirm("Clear all your Read & Rank progress? This can't be undone.")) return;
    reset();
  };

  const handleSignOut = () => {
    track('readrank_signed_out');
    resetIdentity();
    logout();
  };

  const handleSignIn = () => {
    track('readrank_sign_in_initiated');
    window.location.href = `${AUTH_HUB_URL}/login?redirect=${encodeURIComponent(window.location.href)}`;
  };

  const profileMenu = loading
    ? undefined
    : isLoggedIn
      ? {
          label: userName || 'Account',
          items: [
            { label: 'Clear Read & Rank', onClick: handleClearReadRank },
            { label: 'Feedback', href: getFeedbackUrl() },
            { label: 'Sign out', onClick: handleSignOut },
          ],
        }
      : { label: 'Account', items: [
          { label: 'Sign in', onClick: handleSignIn },
          { label: 'Feedback', href: getFeedbackUrl() },
        ] };

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
      <main className={phase === 'hub' ? undefined : 'container mx-auto px-4 py-8 max-w-4xl xl:max-w-6xl 2xl:max-w-[1400px]'}>
        <PhaseContainer />
      </main>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter basename="/">
        <PostHogPageview />
        <Routes>
          <Route path="/" element={<MainApp />} />
          <Route path="/candidate/:candidateId/alignment" element={<CandidateAlignmentPage />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
