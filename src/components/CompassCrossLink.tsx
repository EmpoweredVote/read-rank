import React, { useState } from 'react';

const COMPASS_URL = 'https://compass.empowered.vote';
const dismissKey = (raceId: string) => `compass-cta-dismissed:${raceId}`;

export interface CompassCrossLinkProps {
  raceId: string;
  topTopicTitle: string | null;
}

/**
 * The Compass invitation (REDESIGN_SPEC §10): insight-framed, dismissible,
 * once per race, never a modal, never repeated as a banner.  The yellow
 * Inform chip is approved placement #7 — the one place yellow is a surface.
 */
export const CompassCrossLink: React.FC<CompassCrossLinkProps> = ({ raceId, topTopicTitle }) => {
  const [dismissed, setDismissed] = useState(
    () => window.localStorage?.getItem(dismissKey(raceId)) === '1'
  );

  if (dismissed) return null;

  const dismiss = () => {
    window.localStorage?.setItem(dismissKey(raceId), '1');
    setDismissed(true);
  };

  return (
    <section className="compass-card">
      <span className="inform-chip">Inform</span>
      <h3 className="compass-card-heading">
        {topTopicTitle ? (
          <>Based on what you ranked, {topTopicTitle} appears to matter most to you.</>
        ) : (
          <>Map where you stand on every issue.</>
        )}
      </h3>
      <p className="compass-card-body">
        Compass helps you place yourself on every issue, and your next Read &amp; Rank will
        start with what you care about.
      </p>
      <div className="compass-card-actions">
        <a className="ev-button-primary compass-card-cta" href={COMPASS_URL} target="_blank" rel="noopener noreferrer">
          Calibrate your Compass
        </a>
        <button type="button" className="compass-card-later" onClick={dismiss}>
          Maybe later
        </button>
      </div>
    </section>
  );
};
