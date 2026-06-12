import { RaceHub } from './RaceHub';
import { useReadRankStore } from '../store/useReadRankStore';
import { PRACTICE_QUOTES } from '../data/practiceData';

const STEPS = [
  { n: '01', heading: 'Pick an election', body: 'Choose from local and upcoming races in our Alpha communities.', start: true },
  { n: '02', heading: 'Read the quotes', body: 'Evaluate positions blind.  No names, no parties, just their words.', start: false },
  { n: '03', heading: 'Rank the candidates', body: 'See who earned your trust and where you aligned.', start: false },
];

export function Landing() {
  const { startPractice } = useReadRankStore();

  return (
    <section
      style={{ backgroundColor: 'var(--surface-page)' }}
      className="w-full px-6 sm:px-10 lg:px-20 py-12 lg:py-16"
    >
      {/* Compact hero */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-10 lg:gap-16 items-center mb-12 lg:mb-16">
        <div>
          <p
            className="text-xs font-bold uppercase tracking-widest mb-4"
            style={{ color: 'var(--text-link)', fontFamily: "'Manrope', sans-serif" }}
          >
            Read &amp; Rank
          </p>
          <h1
            className="text-4xl sm:text-5xl font-extrabold leading-tight"
            style={{ color: 'var(--text-heading)', fontFamily: "'Manrope', sans-serif" }}
          >
            Read candidates blind,
            <br />
            <span style={{ color: 'var(--text-link)' }}>rank by what they said.</span>
          </h1>
          <p
            className="text-base sm:text-lg leading-relaxed mt-5 max-w-xl"
            style={{ color: 'var(--text-secondary)', fontFamily: "'Manrope', sans-serif" }}
          >
            Read real quotes from real candidates — without knowing who said it.
            Form your own view. Then find out who you actually align with.
          </p>
          <button
            type="button"
            onClick={() => startPractice(PRACTICE_QUOTES)}
            className="mt-5 px-1 py-2"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: "'Manrope', sans-serif", fontSize: '0.8125rem',
              fontWeight: 600, color: 'var(--text-link)', minHeight: '2.75rem',
            }}
          >
            Not sure yet?&nbsp; Try a 30-second warm-up with pizza opinions.
          </button>
        </div>

        <div className="flex flex-col gap-2.5">
          {STEPS.map(({ n, heading, body, start }) => (
            <div key={n} className="rr-step">
              <span className="rr-step__n">{n}</span>
              <div>
                <div className="rr-step__title">{heading}</div>
                <div className="rr-step__body">{body}</div>
              </div>
              {start && <span className="rr-step__tag">Start here</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Picker, immediately present */}
      <h2
        className="text-xl sm:text-2xl font-bold mb-1"
        style={{ color: 'var(--text-link)', fontFamily: "'Manrope', sans-serif" }}
      >
        Choose an election
      </h2>
      <p
        className="text-sm mb-6"
        style={{ color: 'var(--text-secondary)', fontFamily: "'Manrope', sans-serif" }}
      >
        Each one is a preview of the full Read &amp; Rank experience.
      </p>
      <RaceHub hideHeader />
    </section>
  );
}
