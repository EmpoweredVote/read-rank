import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { RaceHub } from './RaceHub';
import { AddressFilterInput } from './AddressFilterInput';
import { TimeFilterSwitch } from './TimeFilterSwitch';
import { useReadRankStore } from '../store/useReadRankStore';
import { PRACTICE_QUOTES } from '../data/practiceData';
import { track } from '../lib/analytics';
import { useMotion, EASE, DUR, STAGGER } from '../motion';
import type { TimeFilter } from '../utils/raceGrouping';

const STEPS = [
  { heading: 'Pick an election', body: 'Local and upcoming races in our Alpha communities.' },
  { heading: 'Read the quotes', body: 'Judge positions on their words alone.' },
  { heading: 'Rank the candidates', body: 'See who earned your trust, and where you align.' },
];

export function Landing() {
  const { startPractice, locationFilter, browseTarget } = useReadRankStore();
  const m = useMotion();
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('upcoming');
  const pickerHeadingRef = useRef<HTMLHeadingElement>(null);
  const showSwitch = locationFilter !== null && !browseTarget;
  const browsing = browseTarget !== null;
  const pickerRef = useRef<HTMLDivElement>(null);
  const wasBrowsing = useRef(browsing);

  // Leaving Browse: land back at the picker, not the top of the hero.
  useEffect(() => {
    if (wasBrowsing.current && !browsing) {
      pickerRef.current?.scrollIntoView({ behavior: m.reduced ? 'auto' : 'smooth', block: 'start' });
    }
    wasBrowsing.current = browsing;
  }, [browsing, m.reduced]);

  const enter = (i: number) => ({
    ...m.enter({ y: 12 }),
    transition: m.transition(DUR.moderate, EASE.settle, { delay: i * 0.06 }),
  });

  function goToPicker() {
    track('readrank_landing_cta_clicked');
    const h = pickerHeadingRef.current;
    if (!h) return;
    h.scrollIntoView({ behavior: m.reduced ? 'auto' : 'smooth', block: 'start' });
    h.focus({ preventScroll: true });
  }

  return (
    <section style={{ backgroundColor: 'var(--surface-page)' }} className="w-full py-10">
      {/* Bounded to line up with the ev-ui Header (1512px border-box, 24px inset). */}
      <div className="mx-auto px-6" style={{ maxWidth: '1512px' }}>
        {/* Hero */}
        {!browsing && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-16 lg:gap-24 items-center mb-12 lg:mb-16">
          <div>
            <motion.p className="text-xs font-bold uppercase tracking-widest mb-5"
              style={{ color: 'var(--text-link)' }} {...enter(0)}>
              Read &amp; Rank
            </motion.p>
            <motion.h1 className="text-5xl sm:text-6xl font-bold leading-tight"
              style={{ color: 'var(--text-heading)' }} {...enter(1)}>
              Read candidates blind,
            </motion.h1>
            <motion.p className="text-5xl sm:text-6xl font-bold leading-tight mt-1 mb-8"
              style={{ color: 'var(--text-link)' }} {...enter(2)}>
              rank by what they said.
            </motion.p>
            <motion.p className="text-lg leading-relaxed mb-8 max-w-[60ch]"
              style={{ color: 'var(--text-secondary)' }} {...enter(3)}>
              Real quotes from real candidates, with no names and no parties. Form your own
              view, then see who you actually agree with.
            </motion.p>
            <motion.div className="flex flex-col items-start gap-3" {...enter(4)}>
              <button type="button" className="rr-cta" onClick={goToPicker}>
                Choose an election
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 5v14M5 12l7 7 7-7" />
                </svg>
              </button>
              <button
                type="button"
                className="rr-text-btn"
                onClick={() => { track('readrank_practice_started'); startPractice(PRACTICE_QUOTES); }}
              >
                Try a warm-up with pizza opinions
                <span className="rr-cta__meta"> 30 sec</span>
              </button>
            </motion.div>
          </div>

          <ol className="rr-timeline" role="list" aria-label="How it works">
            {STEPS.map(({ heading, body }, i) => (
              <motion.li key={heading} className="rr-timeline__step"
                {...m.enter({ y: 12 })}
                transition={m.transition(DUR.moderate, EASE.settle, { delay: 0.1 + i * (STAGGER.gridCell / 1000) })}>
                <span className={`rr-timeline__n${i === 0 ? ' rr-timeline__n--active' : ''}`} aria-hidden="true">
                  {i + 1}
                </span>
                <div>
                  <div className="rr-timeline__title">{heading}</div>
                  <div className="rr-timeline__body">{body}</div>
                </div>
              </motion.li>
            ))}
          </ol>
        </div>
        )}

        {/* Picker */}
        <div
          id="choose-election"
          ref={pickerRef}
          className={browsing ? 'scroll-mt-6' : 'scroll-mt-6 border-t pt-10'}
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          {!browsing && (
          <div className="flex flex-wrap items-start justify-between gap-4 mb-2">
            <div className="min-w-0 flex-1 basis-full sm:basis-auto">
              <h2
                ref={pickerHeadingRef}
                tabIndex={-1}
                className="text-2xl sm:text-3xl font-semibold mb-2 focus:outline-none"
                style={{ color: 'var(--text-link)' }}
              >
                Choose an election
              </h2>
              <AddressFilterInput />
            </div>
            {showSwitch && <TimeFilterSwitch value={timeFilter} onChange={setTimeFilter} />}
          </div>
          )}
          <RaceHub
            hideHeader
            hideFilter
            hideTimeFilter
            timeFilter={timeFilter}
            onTimeFilterChange={setTimeFilter}
          />
        </div>
      </div>
    </section>
  );
}
