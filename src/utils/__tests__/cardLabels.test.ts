import { describe, it, expect } from 'vitest';
import { disambiguateCardLabels } from '../cardLabels';

/**
 * One topic can host several questions, so two cards can carry the same topic
 * `title` ("Economic Development" twice). Columns and pills labelled by title alone
 * are then indistinguishable — the reader cannot tell which comparison is which.
 * The question is what separates them.
 */
describe('disambiguateCardLabels', () => {
  it('leaves unique titles alone', () => {
    expect(disambiguateCardLabels([
      { key: 'a', title: 'Housing', question: 'Would you upzone?' },
      { key: 'b', title: 'Transit', question: 'Fund rail?' },
    ])).toEqual([
      { key: 'a', title: 'Housing' },
      { key: 'b', title: 'Transit' },
    ]);
  });

  it('uses the question when two cards share a title', () => {
    expect(disambiguateCardLabels([
      { key: 'q-film', title: 'Economic Development', question: 'Film and TV?' },
      { key: 'q-downtown', title: 'Economic Development', question: 'Downtown?' },
    ])).toEqual([
      { key: 'q-film', title: 'Film and TV?' },
      { key: 'q-downtown', title: 'Downtown?' },
    ]);
  });

  it('keeps the title when a colliding card has no question to fall back on', () => {
    // Better a duplicated-but-true label than a blank column header.
    expect(disambiguateCardLabels([
      { key: 'a', title: 'Economic Development', question: '' },
      { key: 'b', title: 'Economic Development', question: 'Downtown?' },
    ])).toEqual([
      { key: 'a', title: 'Economic Development' },
      { key: 'b', title: 'Downtown?' },
    ]);
  });

  it('only disambiguates the cards that actually collide', () => {
    expect(disambiguateCardLabels([
      { key: 'q1', title: 'Economic Development', question: 'Film?' },
      { key: 'q2', title: 'Economic Development', question: 'Downtown?' },
      { key: 'h', title: 'Housing', question: 'Upzone?' },
    ]).map((c) => c.title)).toEqual(['Film?', 'Downtown?', 'Housing']);
  });
});
