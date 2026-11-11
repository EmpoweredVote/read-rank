import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { BallotFigure } from './BallotFigure';

export interface RevealBandProps {
  office: string;
  /** Quotes the user agreed with — shown in the ranked variant. */
  rankedCount: number;
  /** Quotes the user judged, agreed or disagreed — shown in the unranked variant. */
  judgedCount: number;
  topicCount: number;
  /** True when the revealed ballot has no ranked candidates. Driven by the
   *  roster rather than by rankedCount, which counts quotes from the local
   *  store and can disagree with what the backend actually ranked. */
  nothingRanked: boolean;
}

/** The merged reveal beat (spec §1): a persistent dark band atop the results,
 *  led by the race name as a large pill. With nothing ranked, the band drops the
 *  ranking language entirely — "You ranked 0 quotes" reads as an error message
 *  rather than a summary. */
export const RevealBand: React.FC<RevealBandProps> = ({ office, rankedCount, judgedCount, topicCount, nothingRanked }) => {
  const reduced = useReducedMotion();
  const count = nothingRanked ? judgedCount : rankedCount;
  return (
    <motion.div className="reveal-band"
      initial={reduced ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}>
      {office ? <p className="reveal-band-race">{office}</p> : null}
      <h2 className="reveal-band-headline">
        {nothingRanked ? (
          <>Now see <span className="reveal-band-who">who</span> said what</>
        ) : (
          <>Now see <span className="reveal-band-who">who</span> you agreed with</>
        )}
      </h2>
      <p className="reveal-band-eyebrow">
        You {nothingRanked ? 'read' : 'ranked'} {count} quote{count === 1 ? '' : 's'} across {topicCount} topic{topicCount === 1 ? '' : 's'}
      </p>
      <BallotFigure mode="once" className="reveal-band-fig" />
    </motion.div>
  );
};
