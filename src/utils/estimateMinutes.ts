const SECONDS_PER_QUOTE = 10;

export function estimateMinutes(opts: {
  quoteCount?: number | null;
  candidateCount: number;
  topicCount: number;
}): number {
  const quotes = opts.quoteCount && opts.quoteCount > 0
    ? opts.quoteCount
    : Math.max(opts.candidateCount * opts.topicCount, opts.topicCount, 1);
  return Math.max(1, Math.round((quotes * SECONDS_PER_QUOTE) / 60));
}
