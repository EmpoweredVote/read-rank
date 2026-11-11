import { BallotFigure } from './BallotFigure';

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
      <BallotFigure mode="loop" className="ballot-loader__fig" />
      <p className="ballot-loader__title">Tallying your ballot</p>
      <p className="ballot-loader__step">{STEP_TEXT[step]}</p>
      <div className="ballot-loader__track" aria-hidden="true">
        <div className={`ballot-loader__fill ballot-loader__fill--${step}`} />
      </div>
    </div>
  );
}
