import { describe, it, expect, beforeEach } from 'vitest';
import { useReadRankStore, type RacePayload, type BlindQuote } from '../useReadRankStore';
import { deriveProgressState } from '../../utils/raceProgressState';

/**
 * The QUESTION is the unit of comparison, not the topic.
 *
 * The accounts backend (migration 1377, player path fixed 2026-08-17) serves one card
 * per question, so ONE TOPIC CAN PRODUCE SEVERAL CARDS — LA Mayor's economic-development
 * topic hosts a film/TV question and a downtown question. Each card carries its own
 * `key` (the question id, or `topic:<topic_key>` for compass-era rows) and every quote
 * carries `cardKey`.
 *
 * This store keyed `topics` by `topicKey`. Two cards sharing a topicKey therefore
 * COLLIDED: the second overwrote the first, `topicOrder` listed the key twice, and the
 * player saw one question rendered twice while the other's quotes were never shown.
 * Verdicts routed by `quote.topicKey` landed on whichever card survived.
 */

const quote = (id: string, token: string, topicKey: string, cardKey: string): BlindQuote => ({
  id, text: `text-${id}`, candidateToken: token, topicKey, cardKey,
});

const TOPIC = 'economic-development';

/** LA Mayor's split econ-dev topic: two questions, two candidates each. */
const splitTopicPayload: RacePayload = {
  raceId: 'race-la-mayor',
  positionName: 'Los Angeles Mayor',
  topics: [
    {
      key: 'q-film', topicKey: TOPIC, questionId: 'q-film',
      title: 'Economic Development',
      question: 'How would you keep film and TV production in the city?',
      quotes: [
        quote('bass-film', 'tok-a', TOPIC, 'q-film'),
        quote('raman-film', 'tok-b', TOPIC, 'q-film'),
      ],
    },
    {
      key: 'q-downtown', topicKey: TOPIC, questionId: 'q-downtown',
      title: 'Economic Development',
      question: 'What is your plan for downtown?',
      quotes: [
        quote('bass-downtown', 'tok-a', TOPIC, 'q-downtown'),
        quote('raman-downtown', 'tok-b', TOPIC, 'q-downtown'),
      ],
    },
  ],
};

beforeEach(() => {
  window.localStorage?.clear();
  useReadRankStore.getState().reset();
});

describe('two questions in one topic are two cards', () => {
  it('keeps both cards instead of one overwriting the other', () => {
    useReadRankStore.getState().selectRace(splitTopicPayload);
    const race = useReadRankStore.getState().raceProgress['race-la-mayor'];

    expect(Object.keys(race.topics).sort()).toEqual(['q-downtown', 'q-film']);
    expect(race.topicOrder).toEqual(['q-film', 'q-downtown']);
    // Keyed by topicKey this was ['economic-development', 'economic-development'] —
    // one card, listed twice.
    expect(new Set(race.topicOrder).size).toBe(2);
  });

  it('gives each card its own question while both keep the real topicKey', () => {
    useReadRankStore.getState().selectRace(splitTopicPayload);
    const race = useReadRankStore.getState().raceProgress['race-la-mayor'];

    expect(race.topics['q-film'].question).toBe('How would you keep film and TV production in the city?');
    expect(race.topics['q-downtown'].question).toBe('What is your plan for downtown?');
    expect(race.topics['q-film'].topicKey).toBe(TOPIC);
    expect(race.topics['q-downtown'].topicKey).toBe(TOPIC);
  });

  it('shows every quote — none are silently dropped', () => {
    useReadRankStore.getState().selectRace(splitTopicPayload);
    const race = useReadRankStore.getState().raceProgress['race-la-mayor'];

    const shown = Object.values(race.topics).flatMap((t) => t.quotesToEvaluate.map((q) => q.id));
    expect(shown.sort()).toEqual(['bass-downtown', 'bass-film', 'raman-downtown', 'raman-film']);
  });

  it('routes an agree verdict to the card the quote belongs to', () => {
    const store = useReadRankStore.getState();
    store.selectRace(splitTopicPayload);
    store.agree(quote('bass-downtown', 'tok-a', TOPIC, 'q-downtown'));

    const race = useReadRankStore.getState().raceProgress['race-la-mayor'];
    expect(race.topics['q-downtown'].agreed.map((q) => q.id)).toEqual(['bass-downtown']);
    expect(race.topics['q-film'].agreed).toEqual([]);
  });

  it('routes a disagree verdict to the card the quote belongs to', () => {
    const store = useReadRankStore.getState();
    store.selectRace(splitTopicPayload);
    store.disagree(quote('raman-film', 'tok-b', TOPIC, 'q-film'));

    const race = useReadRankStore.getState().raceProgress['race-la-mayor'];
    expect(race.topics['q-film'].disagreed.map((q) => q.id)).toEqual(['raman-film']);
    expect(race.topics['q-downtown'].disagreed).toEqual([]);
  });

  it('counts both cards as scorable progress, not one', () => {
    useReadRankStore.getState().selectRace(splitTopicPayload);
    const race = useReadRankStore.getState().raceProgress['race-la-mayor'];

    // selectedTopicKeys holds CARD keys, so a scorable check against t.topicKey
    // matched nothing and reported 0 of the user's own selected cards.
    const info = deriveProgressState(race, 2);
    expect(info.selectedScorableTopics).toBe(2);
    expect(info.liveScorableTopics).toBe(2);
  });

  it('refreshes each card question independently for a returning user', () => {
    const store = useReadRankStore.getState();
    store.selectRace(splitTopicPayload);
    store.agree(quote('bass-film', 'tok-a', TOPIC, 'q-film'));

    const edited: RacePayload = {
      ...splitTopicPayload,
      topics: [
        { ...splitTopicPayload.topics[0], question: 'FILM question, sharpened' },
        { ...splitTopicPayload.topics[1], question: 'DOWNTOWN question, sharpened' },
      ],
    };
    store.selectRace(edited);

    const race = useReadRankStore.getState().raceProgress['race-la-mayor'];
    expect(race.topics['q-film'].question).toBe('FILM question, sharpened');
    expect(race.topics['q-downtown'].question).toBe('DOWNTOWN question, sharpened');
    expect(race.topics['q-film'].agreed.map((q) => q.id)).toEqual(['bass-film']); // verdict preserved
  });
});

describe('payloads without card keys behave exactly as before', () => {
  // Tolerance for an accounts backend that has not yet deployed the per-question
  // payload: no `key`/`cardKey` means fall back to topicKey, which is bit-identical
  // to the pre-fix behaviour rather than inventing a synthetic prefix.
  const legacyPayload = {
    raceId: 'race-legacy',
    positionName: 'Governor',
    topics: [{
      topicKey: 'housing',
      title: 'Housing',
      question: 'Q?',
      quotes: [
        { id: 'l1', text: 'one', candidateToken: 'c1', topicKey: 'housing' },
        { id: 'l2', text: 'two', candidateToken: 'c2', topicKey: 'housing' },
      ],
    }],
  } as unknown as RacePayload;

  it('keys the card by topicKey and still routes verdicts', () => {
    const store = useReadRankStore.getState();
    store.selectRace(legacyPayload);
    store.agree({ id: 'l1', text: 'one', candidateToken: 'c1', topicKey: 'housing' } as BlindQuote);

    const race = useReadRankStore.getState().raceProgress['race-legacy'];
    expect(Object.keys(race.topics)).toEqual(['housing']);
    expect(race.topics.housing.agreed.map((q) => q.id)).toEqual(['l1']);
  });
});
