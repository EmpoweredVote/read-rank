import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { SiteHeader } from '@chrisandrewsedu/ev-ui';
import { PhaseContainer } from './components/PhaseContainer';
import { DevHelper } from './components/DevHelper';
import { CandidateAlignmentPage } from './components/CandidateAlignmentPage';
import { useAuthState } from './hooks/useAuthState';
import { useReadRankStore } from './store/useReadRankStore';

function MainApp() {
  const { isLoggedIn, userName, loading, logout } = useAuthState();
  const { reset } = useReadRankStore();

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
      : { label: 'Account', items: [{ label: 'Sign in', href: `${(import.meta.env as Record<string, string>).VITE_COMPASS_URL || 'https://compass.empowered.vote'}/login?returnTo=${encodeURIComponent(window.location.href)}` }] };

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
