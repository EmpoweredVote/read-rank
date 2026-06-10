import React, { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { TIER_META, tierForIndex } from '../utils/tiers';
import { TierIcon } from './TierIcon';
import { SourceLine } from './SourceLine';
import type { QuoteIdentity } from '../utils/revealInsight';

export interface RevealCardProps {
  quoteText: string;
  /** Position in the user's agreed ranking (0-based) — sets the tier frame. */
  index: number;
  identity: QuoteIdentity;
  revealed: boolean;
  onReveal: () => void;
}

/**
 * One quote on the reveal board (REDESIGN_SPEC §1.4, §3.5). The front face is
 * the user's anonymous tier-framed ranking row; the back face unmasks the
 * candidate. The candidate name never enters the DOM until `revealed` —
 * blindness is structural here too. The flip is decorative; identity content
 * mounts instantly on reveal (§7.2).
 */
export const RevealCard: React.FC<RevealCardProps> = ({ quoteText, index, identity, revealed, onReveal }) => {
  const prefersReducedMotion = useReducedMotion();
  const tier = tierForIndex(index);
  const meta = TIER_META[tier];
  const [imgOk, setImgOk] = useState(true);

  const frame = (
    <>
      {tier !== 'bronze' && (
        <div className={`tier-label tier-label-${tier}`}>
          <TierIcon tier={tier} size={12} />
          {meta.label}
        </div>
      )}
    </>
  );

  if (!revealed) {
    return (
      <div className={`tier-row tier-row-${tier} reveal-card`}>
        <span className="tier-rank-num" aria-hidden="true">{index + 1}</span>
        <div className="reveal-card-main">
          {frame}
          <p className="reveal-card-quote"><span aria-hidden="true">&ldquo;</span><span>{quoteText}</span><span aria-hidden="true">&rdquo;</span></p>
        </div>
        <button type="button" className="reveal-card-trigger" onClick={onReveal}>
          Reveal
        </button>
      </div>
    );
  }

  const initials = identity.name.split(' ').map((n) => n[0]).join('').slice(0, 2);

  return (
    <motion.div
      className={`tier-row tier-row-${tier} reveal-card reveal-card-revealed`}
      initial={prefersReducedMotion ? false : { rotateY: 90, opacity: 0.4 }}
      animate={{ rotateY: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      <span className="tier-rank-num" aria-hidden="true">{index + 1}</span>
      <div className="reveal-card-main">
        {frame}
        <div className="reveal-card-identity">
          {identity.photo && imgOk ? (
            <img
              src={identity.photo}
              alt=""
              onError={() => setImgOk(false)}
              className="reveal-card-photo"
            />
          ) : (
            <span className="reveal-card-photo reveal-card-initials" aria-hidden="true">{initials}</span>
          )}
          <div>
            <div className="reveal-card-name">{identity.name}</div>
            <div className="reveal-card-office">{identity.office}</div>
          </div>
        </div>
        <p className="reveal-card-quote"><span aria-hidden="true">&ldquo;</span><span>{quoteText}</span><span aria-hidden="true">&rdquo;</span></p>
        <div className="reveal-card-footer">
          <SourceLine sourceName={identity.sourceName} sourceUrl={identity.sourceUrl} variant="compact" />
          <a
            href={identity.essentialsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="reveal-card-profile-link"
          >
            View candidate
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
      </div>
    </motion.div>
  );
};
