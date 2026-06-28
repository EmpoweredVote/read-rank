import { motion } from 'framer-motion';
import { RaceHub } from './RaceHub';
import { AddressFilterInput } from './AddressFilterInput';
import { useReadRankStore } from '../store/useReadRankStore';
import { PRACTICE_QUOTES } from '../data/practiceData';
import { track } from '../lib/analytics';
import { useMotion, EASE, DUR, STAGGER } from '../motion';

const STEPS = [
  { n: '01', heading: 'Pick an election', body: 'Choose from local and upcoming races in our Alpha communities.', start: true },
  { n: '02', heading: 'Read the quotes', body: 'Evaluate positions blind.  No names, no parties, just their words.', start: false },
  { n: '03', heading: 'Rank the candidates', body: 'See who earned your trust and where you aligned.', start: false },
];

export function Landing() {
  const { startPractice } = useReadRankStore();
  const m = useMotion();

  return (
    <section
      style={{ backgroundColor: 'var(--surface-page)' }}
      className="w-full py-10"
    >
      {/* Content is bounded and padded to line up with the ev-ui Header:
          a centered max-w container matching the Header's 1512px border-box and its
          24px content inset, so the hero/heading/picker share the logo↔profile edges. */}
      <div className="mx-auto px-6" style={{ maxWidth: '1512px' }}>
      {/* Hero */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-16 lg:gap-24 items-start mb-12 lg:mb-16">
        <motion.div>
          <motion.p
            className="text-xs font-bold uppercase tracking-widest mb-5"
            style={{ color: 'var(--text-link)', fontFamily: "'Manrope', sans-serif" }}
            {...m.enter({ y: 12 })}
            transition={m.transition(DUR.moderate, EASE.settle, { delay: 0 })}
          >
            Read &amp; Rank
          </motion.p>
          <motion.h1
            className="text-5xl sm:text-6xl font-bold leading-tight"
            style={{ color: 'var(--text-heading)', fontFamily: "'Manrope', sans-serif" }}
            {...m.enter({ y: 12 })}
            transition={m.transition(DUR.moderate, EASE.settle, { delay: 0.06 })}
          >
            Read candidates blind,
          </motion.h1>
          <motion.p
            className="text-5xl sm:text-6xl font-bold leading-tight mt-1 mb-8"
            style={{ color: 'var(--text-link)', fontFamily: "'Manrope', sans-serif" }}
            {...m.enter({ y: 12 })}
            transition={m.transition(DUR.moderate, EASE.settle, { delay: 0.12 })}
          >
            rank by what they said.
          </motion.p>
          <motion.p
            className="text-lg leading-relaxed mb-3"
            style={{ color: 'var(--text-secondary)', fontFamily: "'Manrope', sans-serif" }}
            {...m.enter({ y: 12 })}
            transition={m.transition(DUR.moderate, EASE.settle, { delay: 0.18 })}
          >
            Read real quotes from real candidates — without knowing who said it.
            Form your own view. Then find out who you actually align with.
          </motion.p>
          <motion.button
            type="button"
            onClick={() => { track('readrank_practice_started'); startPractice(PRACTICE_QUOTES); }}
            className="mb-6 px-1 py-2"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: "'Manrope', sans-serif", fontSize: '0.875rem',
              fontWeight: 600, color: 'var(--text-link)', minHeight: '2.75rem',
            }}
            {...m.enter({ y: 12 })}
            transition={m.transition(DUR.moderate, EASE.settle, { delay: 0.24 })}
          >
            Not sure yet?&nbsp; Try a 30-second warm-up with pizza opinions.
          </motion.button>
          <AddressFilterInput />
        </motion.div>

        <div className="space-y-3">
          {STEPS.map(({ n, heading, body, start }, i) => (
            <motion.div key={n} className="rr-step"
              {...m.enter({ y: 12 })}
              transition={m.transition(DUR.moderate, EASE.settle, { delay: 0.1 + i * (STAGGER.gridCell / 1000) })}>
              <span className="rr-step__n">{n}</span>
              <div>
                <div className="rr-step__title">{heading}</div>
                <div className="rr-step__body">{body}</div>
              </div>
              {start && <span className="rr-step__tag">Start here</span>}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Picker */}
      <h2
        className="text-2xl sm:text-3xl font-semibold mb-6"
        style={{ color: 'var(--text-link)', fontFamily: "'Manrope', sans-serif" }}
      >
        Choose an election
      </h2>
      <RaceHub hideHeader hideFilter />
      </div>
    </section>
  );
}
