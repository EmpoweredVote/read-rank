import React from 'react';
import lightSymbol from '../assets/essentials-symbol-light.svg';
import darkSymbol from '../assets/essentials-symbol-dark.svg';

export interface EssentialsLogoProps {
  href: string;
  /** Rendered height in px. */
  size?: number;
  onClick?: () => void;
}

/** Essentials symbol that links out to a candidate's Essentials profile. */
export const EssentialsLogo: React.FC<EssentialsLogoProps> = ({ href, size = 30, onClick }) => (
  <a href={href} target="_blank" rel="noopener noreferrer" onClick={onClick}
    className="essentials-logo" aria-label="View on Essentials">
    <img src={lightSymbol} alt="" aria-hidden="true" className="essentials-logo-light" style={{ height: size }} />
    <img src={darkSymbol} alt="" aria-hidden="true" className="essentials-logo-dark" style={{ height: size }} />
  </a>
);
