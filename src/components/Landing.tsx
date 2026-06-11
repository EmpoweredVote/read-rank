import { useTheme } from '../ThemeProvider';
import { RaceHub } from './RaceHub';
import { useReadRankStore } from '../store/useReadRankStore';
import { PRACTICE_QUOTES } from '../data/practiceData';

const STEPS = [
  {
    n: '01',
    heading: 'Pick an Election',
    body: 'Choose from local and upcoming races in our Alpha communities.',
    active: true,
  },
  {
    n: '02',
    heading: 'Read the Quotes',
    body: 'Evaluate candidate positions blind — no names, no parties, just their words.',
    active: false,
  },
  {
    n: '03',
    heading: 'Rank the Candidates',
    body: 'See who earned your trust and where you and your candidates aligned.',
    active: false,
  },
];

export function Landing() {
  const { isDark } = useTheme();
  const { startPractice } = useReadRankStore();

  return (
    <div>

      {/* ── Hero ── */}
      <section
        style={{ backgroundColor: 'var(--surface-raised)' }}
        className="min-h-[calc(100vh-73px)] flex items-center w-full"
      >
        <div className="w-full px-8 sm:px-12 lg:px-24 py-16">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-16 lg:gap-24 items-center">

            {/* Left: headline + copy */}
            <div>
              <p
                className="text-xs font-bold uppercase tracking-widest mb-5"
                style={{ color: 'var(--color-ev-muted-blue)', fontFamily: "'Manrope', sans-serif" }}
              >
                Read &amp; Rank
              </p>
              <h1
                className="text-5xl sm:text-6xl font-bold leading-tight"
                style={{ color: 'var(--text-heading)', fontFamily: "'Manrope', sans-serif" }}
              >
                Read what candidates say,
              </h1>
              <p
                className="text-5xl sm:text-6xl font-bold leading-tight mt-1 mb-8"
                style={{ color: 'var(--color-ev-muted-blue)', fontFamily: "'Manrope', sans-serif" }}
              >
                rank them on what matters.
              </p>
              <p
                className="text-lg leading-relaxed mb-3"
                style={{ color: 'var(--text-secondary)', fontFamily: "'Manrope', sans-serif" }}
              >
                Most voters see only names on a ballot. Candidates are defined by what they actually say.
              </p>
              <p
                className="text-lg leading-relaxed"
                style={{ color: 'var(--text-secondary)', fontFamily: "'Manrope', sans-serif" }}
              >
                Read real quotes, form your own view — then see who earned your trust.
              </p>
            </div>

            {/* Right: step cards */}
            <div className="space-y-3">
              {STEPS.map(({ n, heading, body, active }) => (
                <div
                  key={n}
                  style={{
                    backgroundColor: isDark
                      ? (active ? 'var(--surface-card)' : 'var(--surface-sunken)')
                      : (active ? 'var(--surface-card)' : 'var(--surface-page)'),
                    borderColor: isDark
                      ? (active ? 'var(--color-ev-muted-blue)' : 'var(--border-subtle)')
                      : (active ? 'var(--color-ev-muted-blue)' : 'var(--border-medium)'),
                  }}
                  className="flex items-start gap-4 p-5 rounded-2xl border transition-colors"
                >
                  <div
                    style={{
                      backgroundColor: active
                        ? 'rgba(0, 101, 124, 0.12)'
                        : isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)',
                      color: active ? 'var(--color-ev-muted-blue)' : 'var(--text-tertiary)',
                    }}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                  >
                    {n}
                  </div>
                  <div>
                    <p
                      className="font-bold mb-1"
                      style={{
                        color: active ? 'var(--text-heading)' : 'var(--text-secondary)',
                        fontFamily: "'Manrope', sans-serif",
                      }}
                    >
                      {heading}
                    </p>
                    <p
                      className="text-sm leading-relaxed"
                      style={{
                        color: active ? 'var(--text-secondary)' : 'var(--text-tertiary)',
                        fontFamily: "'Manrope', sans-serif",
                      }}
                    >
                      {body}
                    </p>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={() => startPractice(PRACTICE_QUOTES)}
                className="w-full text-left mt-1 px-2 py-3"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: "'Manrope', sans-serif",
                  fontSize: '0.8125rem',
                  color: 'var(--text-link)',
                  minHeight: '2.75rem',
                }}
              >
                Not sure yet?&nbsp; Try a 30-second warm-up with pizza opinions.
              </button>
            </div>

          </div>
        </div>
      </section>

      {/* ── Election Picker ── */}
      <section
        style={{ backgroundColor: 'var(--surface-page)' }}
        className="w-full px-8 sm:px-12 lg:px-24 py-16"
      >
        <h2
          className="text-2xl sm:text-3xl font-semibold mb-2"
          style={{ color: 'var(--color-ev-muted-blue)', fontFamily: "'Manrope', sans-serif" }}
        >
          Choose an election
        </h2>
        <p
          className="text-base mb-8"
          style={{ color: 'var(--text-secondary)', fontFamily: "'Manrope', sans-serif" }}
        >
          Each election is a preview of the full Read &amp; Rank experience.
        </p>
        <RaceHub hideHeader />
      </section>

    </div>
  );
}
