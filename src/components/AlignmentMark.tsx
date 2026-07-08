import React from 'react';
import type { AlignmentMark } from '../utils/alignmentMarks';
import { RankNumber } from './RankNumber';

export interface AlignmentMarkViewProps {
  mark: AlignmentMark;
  /** Icon/number size in px. */
  size?: number;
}

const CircleCheck: React.FC<{ size: number }> = ({ size }) => (
  <svg className="mark-agreed" width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="9" /><path d="M8.5 12.5l2.5 2.5 4.5-5.5" />
  </svg>
);
const CircleX: React.FC<{ size: number }> = ({ size }) => (
  <svg className="mark-disagreed" width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="9" /><path d="M9 9l6 6M15 9l-6 6" />
  </svg>
);
const Dash: React.FC<{ size: number }> = ({ size }) => (
  <svg className="mark-none" width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <path d="M7 12h10" />
  </svg>
);

/** One alignment mark: number chip, agreed check, disagreed cross, or a faint dash. */
export const AlignmentMarkView: React.FC<AlignmentMarkViewProps> = ({ mark, size = 22 }) => {
  if (mark == null) {
    return (<span className="alignment-mark mark-none-wrap"><Dash size={size} /><span className="sr-only">Not judged</span></span>);
  }
  if (mark.kind === 'rank') {
    return (<span className="alignment-mark"><RankNumber rank={mark.rank} size={size + 2} /><span className="sr-only">Ranked {mark.rank}</span></span>);
  }
  if (mark.kind === 'agreed') {
    return (<span className="alignment-mark mark-agreed-wrap"><CircleCheck size={size} /><span className="sr-only">Agreed</span></span>);
  }
  return (<span className="alignment-mark mark-disagreed-wrap"><CircleX size={size} /><span className="sr-only">Disagreed</span></span>);
};
