interface BallotLoaderProps {
  step: 'matching' | 'revealing';
}

const STEP_TEXT: Record<BallotLoaderProps['step'], string> = {
  matching: 'Matching your rankings to candidates…',
  revealing: 'Revealing names…',
};

/** Loading beat before the reveal (prototype screen 07). Driven by real state, not a script. */
export function BallotLoader({ step }: BallotLoaderProps) {
  return (
    <div className="ballot-loader" role="status" aria-live="polite">
      <div className="ballot-loader__cards" aria-hidden="true">
        <span className="ballot-loader__card ballot-loader__card--back" />
        <span className="ballot-loader__card ballot-loader__card--front">
          <span className="ballot-loader__line ballot-loader__line--accent" />
          <span className="ballot-loader__line" />
        </span>
      </div>
      <p className="ballot-loader__title">Tallying your ballot</p>
      <p className="ballot-loader__step">{STEP_TEXT[step]}</p>
      <div className="ballot-loader__track" aria-hidden="true">
        <div className={`ballot-loader__fill ballot-loader__fill--${step}`} />
      </div>
    </div>
  );
}
