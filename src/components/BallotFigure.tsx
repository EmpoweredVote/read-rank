import React from 'react';
import ballotFigure from '../assets/ballot-figure.png';

export interface BallotFigureProps {
  /** `loop`: the slip keeps dropping (loading). `once`: it drops a single time (reveal). */
  mode: 'loop' | 'once';
  className?: string;
}

/**
 * The empowered.vote ballot-casting figure ("Bobit"), recoloured with a CSS mask
 * so it follows the theme tokens. A yellow slip drops into the box. Decorative.
 * Size comes from the className (see `.ballot-fig` in index.css).
 */
export const BallotFigure: React.FC<BallotFigureProps> = ({ mode, className }) => (
  <span
    className={`ballot-fig ballot-fig--${mode}${className ? ` ${className}` : ''}`}
    style={{ ['--ballot-fig-url' as string]: `url(${ballotFigure})` }}
    aria-hidden="true"
  >
    <span className="ballot-fig__slip" />
  </span>
);
