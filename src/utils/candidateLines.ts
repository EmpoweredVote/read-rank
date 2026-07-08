export interface CandidateLineFields {
  office: string;
  title?: string;
  chamber?: string;
  district?: string;
}

/** Compose the card's 2nd (position) and 3rd (jurisdiction) lines, with office fallback. */
export function candidateLines(f: CandidateLineFields): { line2: string; line3: string } {
  const line2 = f.title?.trim() || f.office;
  const line3 = [f.chamber, f.district].map((s) => s?.trim()).filter(Boolean).join(' · ');
  return { line2, line3 };
}
