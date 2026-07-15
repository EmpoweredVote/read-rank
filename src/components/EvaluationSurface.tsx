import React, { useState, useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { AnimatePresence, useReducedMotion, motion, useMotionValue, useTransform, type PanInfo } from 'framer-motion';
import { FlyingCard, type FlyRect } from './FlyingCard';
import { flushSync } from 'react-dom';
import type { BlindQuote } from '../store/useReadRankStore';
import { DUR } from '../motion';
import { QuoteCard } from './QuoteCard';
import { ActionButtons } from './ActionButtons';
import { RankedListSidebar } from './AgreedQuotesSidebar';
import { useDeviceType } from '../hooks/useDeviceType';
import CoachMark from './CoachMark';
import { RankDock } from './RankDock';
import { RankSheet } from './RankSheet';
import { FirstAgreeCoach } from './FirstAgreeCoach';
import { tierForIndex, TIER_META } from '../utils/tiers';
import { RankSourceProvider, type RankSource } from './RankSource';

function delay(ms: number) { return new Promise<void>((r) => setTimeout(r, ms)); }
function toFlyRect(r: DOMRect): FlyRect { return { top: r.top, left: r.left, width: r.width, height: r.height }; }
/** Horizontal swipe distance (px) past which a release commits a verdict. */
const SWIPE_THRESHOLD = 90;
/** Horizontal flick velocity (px/s) that commits even below the distance threshold. */
const SWIPE_VELOCITY = 600;

export interface EvaluationSurfaceProps {
  /** The quote currently being triaged, or undefined when the pile is exhausted. */
  currentQuote: BlindQuote | undefined;
  /** 1-based index of the current quote and total count, for the progress line. */
  progress: { current: number; total: number };
  /** Everything is triaged (drives reveal pulse, mobile sheet auto-open, and the sheet's completion header). */
  allDone: boolean;
  /** Commit a verdict to the active source (store mutation only — the surface owns the animation). */
  onVerdict: (direction: 'agree' | 'disagree', quote: BlindQuote) => void;
  /** Show the sourcing-methodology info button on the card (practice = false). */
  showTrustFooter?: boolean;
  /** Agreed/disagreed data + reorder/reAgree for the ranking surface. */
  source: RankSource;
  /** Header slot: TopicStepper (race) or the practice header. */
  header?: React.ReactNode;
  /** Shown in place of the card when currentQuote is undefined. */
  completeState: React.ReactNode;
  /** Reveal CTA: desktop button + mobile sheet footer. */
  reveal: { label: string; onReveal: () => void; enabled: boolean };
  /** Run the coach-mark tour (resolved upstream, e.g. !coachMarksCompleted). */
  showCoachMarks: boolean;
  /** Called when the tour finishes/dismisses. */
  onCoachComplete: () => void;
}

export const EvaluationSurface: React.FC<EvaluationSurfaceProps> = ({
  currentQuote,
  progress,
  allDone,
  onVerdict,
  showTrustFooter = true,
  source,
  header,
  completeState,
  reveal,
  showCoachMarks,
  onCoachComplete,
}) => {
  const agreed = source.agreed;

  const shownCount = currentQuote ? progress.current : progress.total;
  const progressPercent =
    progress.total > 0
      ? Math.round(((currentQuote ? progress.current - 1 : progress.total) / progress.total) * 100)
      : 0;

  const deviceType = useDeviceType();
  const isMouseDevice = deviceType === 'mouse' || deviceType === 'unknown';

  const [isAnimating, setIsAnimating] = useState(false);
  const [verdictAnnounce, setVerdictAnnounce] = useState('');
  const prefersReducedMotion = useReducedMotion();
  const [flight, setFlight] = useState<{ text: string; from: FlyRect; to: FlyRect } | null>(null);
  // Desktop: the just-committed agreed row, hidden while the flight lands on it.
  const [landingId, setLandingId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Mobile swipe — drag the quote card; peek labels react to the live offset.
  const dragX = useMotionValue(0);
  const agreePeekOpacity = useTransform(dragX, [12, SWIPE_THRESHOLD], [0, 1]);
  const disagreePeekOpacity = useTransform(dragX, [-SWIPE_THRESHOLD, -12], [1, 0]);
  const cardRotate = useTransform(dragX, [-240, 240], [-5, 5]);
  const autoOpenedRef = useRef(false);
  const dockRef = useRef<HTMLButtonElement>(null);
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  const [tourStep, setTourStep] = useState<1 | 2 | null>(null);
  const swipeAreaRef = useRef<HTMLDivElement>(null);
  const quoteCardRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Coach mark tour
  useEffect(() => {
    if (!showCoachMarks) return;
    const timer = setTimeout(() => setTourStep(1), 500);
    return () => clearTimeout(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-expand sheet on completion (mobile only, once)
  useEffect(() => {
    if (!isMouseDevice && allDone && !autoOpenedRef.current) {
      autoOpenedRef.current = true;
      setSheetOpen(true);
    }
  }, [isMouseDevice, allDone]);

  const finishTour = useCallback(() => {
    setTourStep(null);
    onCoachComplete();
  }, [onCoachComplete]);

  const handleButtonSwipe = async (direction: 'agree' | 'disagree') => {
    if (isAnimating || !currentQuote) return;
    setIsAnimating(true);

    // Agree → fly the card into the pile (desktop: sidebar, mobile: dock).
    // Skip the flight for reduced-motion or if either ref is missing; the pile
    // still pulses via RankDock / the sidebar effect.
    const cardEl = quoteCardRef.current;
    const targetEl = isMouseDevice ? sidebarRef.current : dockRef.current;
    const quote = currentQuote;
    const canFly = direction === 'agree' && !prefersReducedMotion && cardEl && targetEl;

    // Desktop: commit first so the real row exists, hide it (landingId), measure
    // it, then fly the card onto it and reveal — one connected, seamless motion.
    if (canFly && isMouseDevice) {
      const from = toFlyRect(cardEl!.getBoundingClientRect());
      if (tourStep === 1) setTourStep(2);
      const tierName = TIER_META[tierForIndex(agreed.length)].name; // pre-commit index = new slot
      // Commit synchronously so the new (hidden) row is in the DOM to measure —
      // a fixed timeout would race the React commit under CPU pressure.
      flushSync(() => {
        onVerdict('agree', quote);
        setLandingId(quote.id);
      });
      setVerdictAnnounce(`Added to your ranking, ${tierName}.`);
      const rowEl = sidebarRef.current?.querySelector(`[data-quote-id="${quote.id}"]`) as HTMLElement | null;
      if (rowEl) {
        setFlight({ text: quote.text, from, to: toFlyRect(rowEl.getBoundingClientRect()) });
        await delay(DUR.flight + 60);
        if (!isMountedRef.current) return;
        setFlight(null);
      }
      setLandingId(null);
      setIsAnimating(false);
      return;
    }

    // Mobile: the dock is collapsed, so the card collapses into it and we commit
    // on landing (there is no full row to hand off to).
    if (canFly && !isMouseDevice) {
      const from = toFlyRect(cardEl!.getBoundingClientRect());
      setFlight({ text: quote.text, from, to: toFlyRect(targetEl!.getBoundingClientRect()) });
      await delay(DUR.flight + 60);
      if (!isMountedRef.current) return;
      if (tourStep === 1) setTourStep(2);
      onVerdict('agree', quote);
      setVerdictAnnounce(`Added to your ranking, ${TIER_META[tierForIndex(agreed.length)].name}.`);
      setFlight(null);
      await delay(60);
      setIsAnimating(false);
      return;
    }

    // Disagree, reduced-motion, or missing refs: brief beat then commit.
    await delay(120);
    if (!isMountedRef.current) return;
    if (tourStep === 1) setTourStep(2);
    if (direction === 'agree') {
      onVerdict('agree', currentQuote);
      setVerdictAnnounce(`Added to your ranking, ${TIER_META[tierForIndex(agreed.length)].name}.`);
    } else {
      onVerdict('disagree', currentQuote);
      setVerdictAnnounce('Moved to disagreed.');
    }
    await delay(250);
    setIsAnimating(false);
  };

  // Mobile: a release past the distance or velocity threshold commits, and the
  // verdict flight continues from the card's current (dragged) position. Below
  // threshold, dragSnapToOrigin springs the card back to center.
  const handleSwipeEnd = (_: unknown, info: PanInfo) => {
    const right = info.offset.x > SWIPE_THRESHOLD || info.velocity.x > SWIPE_VELOCITY;
    const left = info.offset.x < -SWIPE_THRESHOLD || info.velocity.x < -SWIPE_VELOCITY;
    if (!right && !left) return; // dragSnapToOrigin handles the spring-back
    // handleButtonSwipe reads the dragged card rect synchronously before its
    // first await, so the flight starts from the finger. Reset x afterward; the
    // card is hidden during the flight so the reset is never visible.
    handleButtonSwipe(right ? 'agree' : 'disagree');
    dragX.set(0);
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

  const triageContent = (
    <>
      {/* Per-topic quote progress */}
      <div className="text-center">
        <p style={{ fontFamily: "'Manrope', sans-serif", fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '0.375rem' }}>
          {`${shownCount} of ${progress.total}`}
        </p>
        <div className="w-full h-1 rounded-full" style={{ backgroundColor: 'var(--border-subtle)' }}>
          <div className="h-1 rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%`, backgroundColor: 'var(--progress-fill)' }} />
        </div>
      </div>

      <div ref={swipeAreaRef}>
        {currentQuote ? (
          <div className="swipe-card-container">
            {!isMouseDevice && (
              <>
                <motion.div className="swipe-peek swipe-peek-disagree" style={{ opacity: disagreePeekOpacity }} aria-hidden="true">
                  ◀ Disagree
                </motion.div>
                <motion.div className="swipe-peek swipe-peek-agree" style={{ opacity: agreePeekOpacity }} aria-hidden="true">
                  Agree ▶
                </motion.div>
              </>
            )}
            {/* Hidden while a flight is in progress so the clone reads as the
                card itself flying (not a ghost detaching from a card left behind). */}
            <div className="flex justify-center relative z-10" style={{ opacity: (flight || landingId) ? 0 : 1 }}>
              {isMouseDevice ? (
                <AnimatePresence mode="wait">
                  <QuoteCard
                    ref={quoteCardRef}
                    key={currentQuote.id}
                    quote={currentQuote}
                    showTrustFooter={showTrustFooter}
                  />
                </AnimatePresence>
              ) : (
                <motion.div
                  className="w-full"
                  drag={isAnimating ? false : 'x'}
                  dragSnapToOrigin
                  dragElastic={0.5}
                  onDragEnd={handleSwipeEnd}
                  style={{ x: dragX, rotate: cardRotate, touchAction: 'pan-y' }}
                >
                  <AnimatePresence mode="wait">
                    <QuoteCard
                      ref={quoteCardRef}
                      key={currentQuote.id}
                      quote={currentQuote}
                      showTrustFooter={showTrustFooter}
                    />
                  </AnimatePresence>
                </motion.div>
              )}
            </div>
          </div>
        ) : (
          completeState
        )}

        {/* Desktop: paddles sit in the flow under the card. Mobile renders them
            in the fixed bottom stack (with the dock) so the dock is no longer
            hidden behind them. */}
        {currentQuote && isMouseDevice && (
          <ActionButtons
            onAgree={() => handleButtonSwipe('agree')}
            onDisagree={() => handleButtonSwipe('disagree')}
            disabled={isAnimating}
            fixed={false}
          />
        )}
      </div>
    </>
  );

  const revealCta = reveal.enabled && (
    <div className="flex justify-center pt-2">
      <button
        onClick={reveal.onReveal}
        className={`ev-button-primary ${allDone ? 'animate-gentle-pulse' : ''}`}
        style={{ fontSize: '1rem', padding: '0.75rem 2rem' }}
      >
        {reveal.label}
      </button>
    </div>
  );

  const mainColumn = (
    <div className="space-y-5">
      {header}
      {triageContent}
      {isMouseDevice && revealCta}
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

  const verdictLiveRegion = (
    <div className="sr-only" role="status" aria-live="polite">{verdictAnnounce}</div>
  );

  // Desktop: split layout (triage + persistent rank surface)
  if (isMouseDevice) {
    return (
      <RankSourceProvider value={source}>
        <div>
          {verdictLiveRegion}
          <div className="evaluation-split-layout">
            <div className="evaluation-main-panel">{mainColumn}</div>
            <div className="evaluation-sidebar-panel">
              {agreed.length === 1 && <FirstAgreeCoach variant="desktop" />}
              <RankedListSidebar ref={sidebarRef} landingId={landingId} />
            </div>
          </div>
          {coachMarkOverlay}
          {flight && <FlyingCard text={flight.text} from={flight.from} to={flight.to} />}
        </div>
      </RankSourceProvider>
    );
  }

  // Mobile: single column with dock + sheet
  return (
    <RankSourceProvider value={source}>
      <div className={`evaluation-mobile ${currentQuote ? 'has-fixed-paddles' : ''}`}>
        {verdictLiveRegion}
        {mainColumn}
        {agreed.length === 1 && <FirstAgreeCoach variant="mobile" />}
        <div className="mobile-verdict-stack">
          {currentQuote && (
            <ActionButtons
              onAgree={() => handleButtonSwipe('agree')}
              onDisagree={() => handleButtonSwipe('disagree')}
              disabled={isAnimating}
              fixed={false}
            />
          )}
          <RankDock
            ref={dockRef}
            agreed={source.agreed}
            disagreedCount={source.disagreed.length}
            onOpen={() => setSheetOpen(true)}
          />
        </div>
        <RankSheet
          open={sheetOpen}
          allDone={allDone}
          resultsLabel={reveal.label}
          onClose={() => {
            setSheetOpen(false);
            requestAnimationFrame(() => dockRef.current?.focus());
          }}
          onSeeResults={() => {
            setSheetOpen(false);
            reveal.onReveal();
          }}
        />
        {coachMarkOverlay}
        {flight && <FlyingCard text={flight.text} from={flight.from} to={flight.to} />}
      </div>
    </RankSourceProvider>
  );
};
