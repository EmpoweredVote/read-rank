import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

export interface RevealBandProps {
  office: string;
  rankedCount: number;
  topicCount: number;
}

/** The merged reveal beat (spec §1): a persistent dark band atop the results. */
export const RevealBand: React.FC<RevealBandProps> = ({ office, rankedCount, topicCount }) => {
  const reduced = useReducedMotion();
  return (
    <motion.div className="reveal-band"
      initial={reduced ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}>
      <p className="reveal-band-eyebrow">
        {office ? <>{office} · </> : null}
        You ranked {rankedCount} quote{rankedCount === 1 ? '' : 's'} across {topicCount} topic{topicCount === 1 ? '' : 's'}
      </p>
      <h2 className="reveal-band-headline">
        Now see <span className="reveal-band-who">who</span> you agreed with
      </h2>
    </motion.div>
  );
};
