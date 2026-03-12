import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { SiteHeader } from '@chrisandrewsedu/ev-ui';
import { PhaseContainer } from './components/PhaseContainer';
import { ProgressHeader } from './components/ProgressHeader';
import { DevHelper } from './components/DevHelper';
import { CandidateAlignmentPage } from './components/CandidateAlignmentPage';
import { AnimationOptionsPage } from './components/AnimationOptionsPage';

function MainApp() {
  return (
    <div className="min-h-screen bg-ev-white">
      <SiteHeader logoSrc={`${import.meta.env.BASE_URL}EVLogo.svg`} />
      <DevHelper />
      <ProgressHeader />
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
        <Route path="/animation-options" element={<AnimationOptionsPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
