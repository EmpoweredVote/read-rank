import { BrowserRouter, Routes, Route, useSearchParams } from 'react-router-dom';
import { useEffect } from 'react';
import { SiteHeader } from '@empoweredvote/ev-ui';
import { PhaseContainer } from './components/PhaseContainer';
import { DevHelper } from './components/DevHelper';
import { CandidateAlignmentPage } from './components/CandidateAlignmentPage';
import { useAuthState } from './hooks/useAuthState';
import { useReadRankStore } from './store/useReadRankStore';
import { searchPoliticians } from './data/api';
import { extractHashToken, AUTH_HUB_URL } from './lib/auth';

function MainApp() {
  const { isLoggedIn, userName, loading, logout } = useAuthState();
  const { reset, setLocationFilter } = useReadRankStore();

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
    <div className="min-h-screen" style={{ backgroundColor: '#faf7f2' }}>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <SiteHeader
        logoSrc={`${import.meta.env.BASE_URL}EVLogo.svg`}
        {...({ profileMenu } as any)}
      />
      <DevHelper />
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <PhaseContainer />
      </main>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter basename="/">
      <Routes>
        <Route path="/" element={<MainApp />} />
        <Route path="/candidate/:candidateId/alignment" element={<CandidateAlignmentPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
