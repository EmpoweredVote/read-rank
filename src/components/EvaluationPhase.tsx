import React, { useState, useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { AnimatePresence, useReducedMotion } from 'framer-motion';
import { FlyingCard, type FlyRect } from './FlyingCard';
import { useReadRankStore } from '../store/useReadRankStore';
import { QuoteCard } from './QuoteCard';
import { ActionButtons } from './ActionButtons';
import { RankedListSidebar } from './AgreedQuotesSidebar';
import { TopicStepper } from './TopicStepper';
import { useDeviceType } from '../hooks/useDeviceType';
import CoachMark from './CoachMark';
import { RankDock } from './RankDock';
import { RankSheet } from './RankSheet';
import { FirstAgreeCoach } from './FirstAgreeCoach';
import { track } from '../lib/analytics';

function delay(ms: number) { return new Promise<void>((r) => setTimeout(r, ms)); }

export const EvaluationPhase: React.FC = () => {
  const {
    agree,
    disagree,
    finishRace,
    nextTopic,
    getCurrentRaceProgress,
    getCurrentTopicProgress,
    coachMarksCompleted,
    completeCoachMarks,
  } = useReadRankStore();

  const race = getCurrentRaceProgress();
  const topic = getCurrentTopicProgress();

  const agreed = topic?.agreed ?? [];
  const quotesToEvaluate = topic?.quotesToEvaluate ?? [];
  const currentIndex = topic?.currentIndex ?? 0;
  const currentQuote = quotesToEvaluate[currentIndex];

  const topicOrder = race?.topicOrder ?? [];
  const currentTopicIdx = race?.currentTopicKey ? topicOrder.indexOf(race.currentTopicKey) : 0;
  const isLastTopic = currentTopicIdx >= topicOrder.length - 1;
  const topicExhausted = !currentQuote;
  // All topics fully triaged?
  const allTopicsDone = race
    ? Object.values(race.topics).every((t) => t.currentIndex >= t.quotesToEvaluate.length)
    : false;

  const deviceType = useDeviceType();
  const isMouseDevice = deviceType === 'mouse' || deviceType === 'unknown';

  const [isAnimating, setIsAnimating] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  const [flight, setFlight] = useState<{ text: string; from: FlyRect; to: FlyRect } | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const autoOpenedRef = useRef(false);
  const dockRef = useRef<HTMLButtonElement>(null);
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  const disagreedCount = race
    ? Object.values(race.topics).reduce((n, t) => n + t.disagreed.length, 0)
    : 0;

  const [tourStep, setTourStep] = useState<1 | 2 | null>(null);
  const swipeAreaRef = useRef<HTMLDivElement>(null);
  const quoteCardRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Coach mark tour
  useEffect(() => {
    if (coachMarksCompleted) return;
    const timer = setTimeout(() => setTourStep(1), 500);
    return () => clearTimeout(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-expand sheet on completion (mobile only, once)
  useEffect(() => {
    if (!isMouseDevice && allTopicsDone && !autoOpenedRef.current) {
      autoOpenedRef.current = true;
      setSheetOpen(true);
    }
  }, [isMouseDevice, allTopicsDone]);

  const progressPercent = quotesToEvaluate.length > 0
    ? Math.round((Math.min(currentIndex, quotesToEvaluate.length) / quotesToEvaluate.length) * 100)
    : 0;

  const finishTour = useCallback(() => {
    setTourStep(null);
    completeCoachMarks();
  }, [completeCoachMarks]);

  const handleButtonSwipe = async (direction: 'agree' | 'disagree') => {
    if (isAnimating || !currentQuote) return;
    track('readrank_verdict', {
      verdict: direction,
      race_id: race?.raceId,
      topic_key: currentQuote.topicKey,
      quote_id: currentQuote.id,
      candidate_token: currentQuote.candidateToken,
      agreed_so_far: agreed.length,
    });
    setIsAnimating(true);

    // Agree → fly the card into the pile (desktop: sidebar, mobile: dock).
    // Skip the flight for reduced-motion or if either ref is missing; the pile
    // still pulses via RankDock / the sidebar effect.
    const cardEl = quoteCardRef.current;
    const targetEl = isMouseDevice ? sidebarRef.current : dockRef.current;
    if (direction === 'agree' && !prefersReducedMotion && cardEl && targetEl) {
      setFlight({
        text: currentQuote.text,
        from: cardEl.getBoundingClientRect(),
        to: targetEl.getBoundingClientRect(),
      });
      await delay(600); // flight duration (matches FlyingCard)
      if (!isMountedRef.current) return;
      if (tourStep === 1) setTourStep(2);
      agree(currentQuote);
      setFlight(null);
      await delay(80);
      setIsAnimating(false);
      return;
    }

    // Disagree, reduced-motion, or missing refs: brief beat then commit.
    await delay(120);
    if (!isMountedRef.current) return;
    if (tourStep === 1) setTourStep(2);
    if (direction === 'agree') agree(currentQuote);
    else disagree(currentQuote);
    await delay(250);
    setIsAnimating(false);
  };

  // Keep a ref to handleButtonSwipe so the keydown effect can call the latest
  // version without re-registering the listener on every render.
  const handleButtonSwipeRef = useRef(handleButtonSwipe);
  useLayoutEffect(() => {
    handleButtonSwipeRef.current = handleButtonSwipe;
  });

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      if (isAnimating || !currentQuote || sheetOpen) return;
      if (document.querySelector('dialog[open]')) return;
      switch (event.key) {
        case 'ArrowLeft': case 'a': case 'A':
          event.preventDefault(); handleButtonSwipeRef.current('disagree'); break;
        case 'ArrowRight': case 'd': case 'D':
          event.preventDefault(); handleButtonSwipeRef.current('agree'); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAnimating, currentQuote, sheetOpen]);

  const canReveal = agreed.length >= 1;

  const triageContent = (
    <>
      {/* Per-topic quote progress */}
      <div className="text-center">
        <p style={{ fontFamily: "'Manrope', sans-serif", fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '0.375rem' }}>
          {topicExhausted
            ? `${quotesToEvaluate.length} of ${quotesToEvaluate.length}`
            : `${Math.min(currentIndex + 1, quotesToEvaluate.length)} of ${quotesToEvaluate.length}`}
        </p>
        <div className="w-full h-1 rounded-full" style={{ backgroundColor: 'var(--border-subtle)' }}>
          <div className="h-1 rounded-full transition-all duration-300"
            style={{ width: `${topicExhausted ? 100 : progressPercent}%`, backgroundColor: 'var(--progress-fill)' }} />
        </div>
      </div>

      <div ref={swipeAreaRef}>
        {currentQuote ? (
          <div className="swipe-card-container">
            {/* Hidden while a flight is in progress so the clone reads as the
                card itself flying (not a ghost detaching from a card left behind). */}
            <div className="flex justify-center relative z-10" style={{ opacity: flight ? 0 : 1 }}>
              <AnimatePresence mode="wait">
                <QuoteCard
                  ref={quoteCardRef}
                  key={currentQuote.id}
                  quote={currentQuote}
                  displayNumber={currentIndex + 1}
                />
              </AnimatePresence>
            </div>
          </div>
        ) : (
          <div className="evaluation-complete-card">
            <div className="text-center py-8">
              <div style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 800, fontSize: '1.5rem', color: 'var(--text-link)', marginBottom: '0.5rem' }}>
                {isLastTopic ? 'All topics done' : 'Topic complete'}
              </div>
              <p style={{ fontFamily: "'Manrope', sans-serif", fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: 0 }}>
                {isLastTopic ? "Reveal your ballot when you're ready." : 'Move on, or keep ranking your pile.'}
              </p>
              {!isLastTopic && (
                <button onClick={nextTopic} className="ev-button-primary" style={{ marginTop: '1rem', fontSize: '0.9375rem' }}>
                  Next topic →
                </button>
              )}
            </div>
          </div>
        )}

        {currentQuote && (
          <ActionButtons
            onAgree={() => handleButtonSwipe('agree')}
            onDisagree={() => handleButtonSwipe('disagree')}
            disabled={isAnimating}
            fixed={!isMouseDevice}
          />
        )}
      </div>
    </>
  );

  const revealCta = canReveal && (
    <div className="flex justify-center pt-2">
      <button
        onClick={finishRace}
        className={`ev-button-primary ${allTopicsDone ? 'animate-gentle-pulse' : ''}`}
        style={{ fontSize: '1rem', padding: '0.75rem 2rem' }}
      >
        Reveal my ballot
      </button>
    </div>
  );

  const mainColumn = (
    <div className="space-y-5">
      <TopicStepper />
      {triageContent}

      {isMouseDevice && (allTopicsDone || canReveal) && revealCta}
    </div>
  );

  const coachMarkOverlay = (
    <>
      <CoachMark
        targetRef={swipeAreaRef}
        show={tourStep === 1 && !!currentQuote}
        allowSpotlightInteraction
        stepLabel="1 of 2"
        onNext={finishTour}
        onSkipAll={finishTour}
      >
        Tap Agree or Disagree to evaluate each quote.
      </CoachMark>
      {isMouseDevice && (
        <CoachMark
          targetRef={sidebarRef}
          show={tourStep === 2 && agreed.length >= 1}
          allowSpotlightInteraction={false}
          stepLabel="2 of 2"
          onDismiss={finishTour}
        >
          Drag your agreed quotes to rank them — your top 3 are your podium.
        </CoachMark>
      )}
      {!isMouseDevice && (
        <CoachMark
          targetRef={dockRef}
          show={tourStep === 2 && agreed.length >= 1 && !sheetOpen}
          allowSpotlightInteraction={false}
          stepLabel="2 of 2"
          onDismiss={finishTour}
        >
          Your agreed quotes file in here.&nbsp; Tap to rank them — your top 3 are your podium.
        </CoachMark>
      )}
    </>
  );

  // Desktop: split layout (triage + persistent rank surface)
  if (isMouseDevice) {
    return (
      <div>
        <div className="evaluation-split-layout">
          <div className="evaluation-main-panel">{mainColumn}</div>
          <div className="evaluation-sidebar-panel">
            {agreed.length === 1 && <FirstAgreeCoach variant="desktop" />}
            <RankedListSidebar ref={sidebarRef} />
          </div>
        </div>
        {coachMarkOverlay}
        {flight && <FlyingCard text={flight.text} from={flight.from} to={flight.to} durationMs={600} />}
      </div>
    );
  }

  // Mobile: single column with dock + sheet
  return (
    <div className={`evaluation-mobile ${currentQuote ? 'has-fixed-paddles' : ''}`}>
      {mainColumn}
      {agreed.length === 1 && <FirstAgreeCoach variant="mobile" />}
      <RankDock
        ref={dockRef}
        agreed={agreed}
        disagreedCount={disagreedCount}
        onOpen={() => setSheetOpen(true)}
      />
      <RankSheet
        open={sheetOpen}
        allDone={allTopicsDone}
        onClose={() => {
          setSheetOpen(false);
          // Defer past the dialog unmount: while the modal is open the page is
          // inert and focus() outside it is silently ignored.
          requestAnimationFrame(() => dockRef.current?.focus());
        }}
        onSeeResults={() => {
          setSheetOpen(false);
          finishRace();
        }}
      />
      {coachMarkOverlay}
      {flight && <FlyingCard text={flight.text} from={flight.from} to={flight.to} durationMs={600} />}
    </div>
  );
};
