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

/** Per-issue reading time for the issue list: "about 20 sec" / "about 2 min". */
export function formatReadingTime(quoteCount: number): string {
  const seconds = Math.max(0, quoteCount) * SECONDS_PER_QUOTE;
  if (seconds < 60) return `about ${Math.max(10, Math.round(seconds / 10) * 10)} sec`;
  return `about ${estimateMinutes({ quoteCount, candidateCount: 0, topicCount: 0 })} min`;
}
