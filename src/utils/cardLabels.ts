import type { AlignmentTopic } from './alignmentGrid';

export interface LabelledCard {
  key: string;
  title: string;
  question: string;
}

/**
 * Column/pill labels for a race's cards.
 *
 * The QUESTION is the unit of comparison, so one topic can contribute several cards —
 * and they all carry the same topic `title`. Labelling by title alone produced two
 * columns reading "Economic Development" with no way to tell which comparison each
 * one summarised. Where titles collide, the question is the distinguishing text, so
 * use it; where a title is already unique, the shorter topic title reads better.
 *
 * A colliding card with no question keeps its title: a duplicated-but-true label
 * beats a blank column header.
 */
export function disambiguateCardLabels(cards: LabelledCard[]): AlignmentTopic[] {
  const titleCounts = new Map<string, number>();
  for (const c of cards) titleCounts.set(c.title, (titleCounts.get(c.title) ?? 0) + 1);

  return cards.map((c) => {
    const collides = (titleCounts.get(c.title) ?? 0) > 1;
    const question = c.question?.trim();
    return { key: c.key, title: collides && question ? question : c.title };
  });
}
