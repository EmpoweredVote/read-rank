import type { RacePayload, BlindQuote, VerdictRecord } from '../store/useReadRankStore';
import type { RaceSummary, RevealResult, BallotEntry } from './api';

// ============================================================
// Mock race — 2024 Indiana Governor. Used as an offline / dev
// fallback so the full blind → rank → reveal flow works without
// the backend. The blind payload exposes ONLY de-identified text
// + an opaque candidateToken; identities live in MOCK_IDENTITIES
// and are revealed by buildMockReveal().
// ============================================================

export const MOCK_RACE_ID = 'mock-in-gov-2024';

interface MockIdentity {
  candidateId: string;
  name: string;
  office: string;
  photo: string;
}

// Tokens are deliberately meaningless — the blind payload is visible in
// devtools, so nothing in an id or token may hint at the speaker.
const MOCK_IDENTITIES: Record<string, MockIdentity> = {
  'tok-a3f8': {
    candidateId: 'donald-rainwater',
    name: 'Donald Rainwater',
    office: 'Candidate for Indiana Governor',
    photo: 'https://s3.amazonaws.com/ballotpedia-api4/files/thumbs/100/100/DonaldRainwater2024.jpg',
  },
  'tok-c7e2': {
    candidateId: 'jennifer-mccormick',
    name: 'Jennifer McCormick',
    office: 'Candidate for Indiana Governor',
    photo: 'https://s3.amazonaws.com/ballotpedia-api4/files/thumbs/100/100/Jennifer_McCormick.jpg',
  },
  'tok-9d4b': {
    candidateId: 'mike-braun',
    name: 'Mike Braun',
    office: 'Candidate for Indiana Governor',
    photo: 'https://s3.amazonaws.com/ballotpedia-api4/files/thumbs/100/100/Mike_Braun.png',
  },
  'tok-5b61': {
    candidateId: 'maureen-bauer',
    name: 'Maureen Bauer',
    office: 'Candidate for Indiana Governor',
    photo: 'https://s3.amazonaws.com/ballotpedia-api4/files/thumbs/200/300/Mar3020201125PM_80182230_1BA7F9ECD19D4A52829D0F47A0BE6754.jpeg',
  },
};

interface MockTopicMeta {
  topicKey: string;
  title: string;
  question: string;
}

const MOCK_TOPICS: MockTopicMeta[] = [
  {
    topicKey: 'cannabis-legalization',
    title: 'Cannabis Legalization',
    question: 'Should Indiana legalize marijuana — medicinal, recreational, or both?',
  },
  {
    topicKey: 'education-funding',
    title: 'Education Funding',
    question: 'How should Indiana approach public school funding and school choice?',
  },
  {
    topicKey: 'abortion-rights',
    title: 'Abortion Rights',
    question: 'What is your position on abortion access in Indiana?',
  },
];

interface MockQuoteFull {
  id: string;
  text: string; // de-identified — never names the speaker
  token: string;
  topicKey: string;
  sourceUrl?: string;
  sourceName?: string;
}

const MOCK_QUOTES: MockQuoteFull[] = [
  // ===== CANNABIS =====
  { id: 'q-101', token: 'tok-a3f8', topicKey: 'cannabis-legalization',
    text: "We don't need to expand government, add a new commission, or write new regulations. We can make cannabis legal in all forms — medicinal and recreational — right now, and expunge all nonviolent cannabis-related offenses.",
    sourceUrl: 'https://www.wishtv.com/news/election/qa-from-all-indiana-politics-special-the-governors-debate/', sourceName: "WISH-TV Governor's Debate" },
  { id: 'q-102', token: 'tok-c7e2', topicKey: 'cannabis-legalization',
    text: 'About 80% of residents support legalization. My plan calls for a conversation on medical use before adult use. The state is losing out on roughly $177 million in tax revenue because surrounding states have legalized. We need a commission on cannabis use.',
    sourceUrl: 'https://www.wishtv.com/news/election/qa-from-all-indiana-politics-special-the-governors-debate/', sourceName: "WISH-TV Governor's Debate" },
  { id: 'q-103', token: 'tok-9d4b', topicKey: 'cannabis-legalization',
    text: 'Marijuana use is cascading across the country and the state needs to address it seriously. I would have to think about adult use; on medicinal use we are probably ready. On both counts I am going to listen to law enforcement.',
    sourceUrl: 'https://www.wishtv.com/news/election/qa-from-all-indiana-politics-special-the-governors-debate/', sourceName: "WISH-TV Governor's Debate" },
  { id: 'q-104', token: 'tok-5b61', topicKey: 'cannabis-legalization',
    text: 'Now that federal authorities plan to reclassify marijuana, I believe it is time for the state to follow suit with decriminalization and legalization for adult use.',
    sourceUrl: 'https://wsbt.com/news/local/indiana-leaders-reassess-marijuana-stance-as-dea-proposes-historic-reclassification', sourceName: 'WSBT News' },

  // ===== EDUCATION =====
  { id: 'q-105', token: 'tok-a3f8', topicKey: 'education-funding',
    text: 'I believe in universal school choice. The public school system is failing — only 63% of children passed statewide tests in math and English. The state constitution allows funding for public and private schools.',
    sourceUrl: 'https://www.wishtv.com/news/election/qa-from-all-indiana-politics-special-the-governors-debate/', sourceName: "WISH-TV Governor's Debate" },
  { id: 'q-106', token: 'tok-c7e2', topicKey: 'education-funding',
    text: "This isn't about parents choosing — it's about a school choosing. Admission policies need to be examined; a school can turn a child away over academics, race, how they identify, or religious belief. Public dollars need to go to public schools.",
    sourceUrl: 'https://www.wishtv.com/news/election/qa-from-all-indiana-politics-special-the-governors-debate/', sourceName: "WISH-TV Governor's Debate" },
  { id: 'q-107', token: 'tok-9d4b', topicKey: 'education-funding',
    text: 'The state has a leading edge on school choice and competition, and it puts parents as the main stakeholders in their children’s education. One size fits all is a monopoly; choice, competition, and vouchers make it work.',
    sourceUrl: 'https://www.wishtv.com/news/election/qa-from-all-indiana-politics-special-the-governors-debate/', sourceName: "WISH-TV Governor's Debate" },
  { id: 'q-108', token: 'tok-5b61', topicKey: 'education-funding',
    text: 'To improve outcomes we need early childhood education available to all families, fair and adequate funding for K-12 and teacher salaries, and reduced food insecurity through expanded school meal programs.',
    sourceUrl: 'https://www.maureenbauer.com', sourceName: 'Campaign Website' },

  // ===== ABORTION =====
  { id: 'q-109', token: 'tok-a3f8', topicKey: 'abortion-rights',
    text: 'I am pro-life. If new DNA is created at conception, then scientifically life starts at conception, and if we are going to protect life we should protect it from its beginning.',
    sourceUrl: 'https://www.indystar.com/story/news/politics/elections/2024/01/10/2024-indiana-governor-race-qa-with-libertarian-donald-rainwater/71756787007/', sourceName: 'IndyStar' },
  { id: 'q-110', token: 'tok-c7e2', topicKey: 'abortion-rights',
    text: 'I trust women; I trust health care providers. I believe in the standards set by Roe, and it is time we return to that.',
    sourceUrl: 'https://abc7chicago.com/post/2024-election-indiana-governor-candidates-jennifer-mccormick-mike-braun-donald-rainwater-debate-abortion-ban-economics/15466415/', sourceName: "ABC7 Governor's Debate" },
  { id: 'q-111', token: 'tok-9d4b', topicKey: 'abortion-rights',
    text: 'We are a right-to-life state, backing the sanctity of life. The legislature took it on, talked to constituents, and it has withstood the courts. The people have spoken and we got a bill that seems to be working.',
    sourceUrl: 'https://abc7chicago.com/post/2024-election-indiana-governor-candidates-jennifer-mccormick-mike-braun-donald-rainwater-debate-abortion-ban-economics/15466415/', sourceName: "ABC7 Governor's Debate" },
  { id: 'q-112', token: 'tok-5b61', topicKey: 'abortion-rights',
    text: 'Forced birth is not freedom. Forcing government to decide a woman’s health care decisions but not a man’s is not equal. Government’s role is to ensure access to quality, essential health care, especially for the vulnerable.',
    sourceUrl: 'https://iga.in.gov/session/2022ss1/video/house', sourceName: 'Indiana House Debate' },
];

export const mockRaceSummary: RaceSummary = {
  raceId: MOCK_RACE_ID,
  positionName: 'Governor',
  electionName: '2024 Indiana Governor (demo)',
  electionDate: '2024-11-05',
  state: 'IN',
  jurisdictionLevel: 'state',
  candidateCount: Object.keys(MOCK_IDENTITIES).length,
  topicCount: MOCK_TOPICS.length,
  isLocal: false,
};

export function buildMockRacePayload(): RacePayload {
  return {
    raceId: MOCK_RACE_ID,
    positionName: mockRaceSummary.positionName,
    topics: MOCK_TOPICS.map((t) => ({
      topicKey: t.topicKey,
      title: t.title,
      question: t.question,
      quotes: MOCK_QUOTES.filter((q) => q.topicKey === t.topicKey).map<BlindQuote>((q) => ({
        id: q.id,
        text: q.text,
        candidateToken: q.token,
        topicKey: q.topicKey,
      })),
    })),
  };
}

/** Client-side mock of the verdict+rank candidate-match scoring. */
export function buildMockReveal(verdicts: VerdictRecord[]): RevealResult {
  const quoteById = new Map(MOCK_QUOTES.map((q) => [q.id, q]));
  const verdictByQuote = new Map(verdicts.map((v) => [v.quote_id, v]));

  interface Agg {
    token: string;
    agreementCount: number;
    firstPlaceCount: number;
    topicsWithAgreement: Set<string>;
    score: number;
    perTopic: Map<string, BallotEntry['perTopic'][number]>;
  }
  const aggs = new Map<string, Agg>();
  const ensure = (token: string): Agg => {
    let a = aggs.get(token);
    if (!a) {
      a = { token, agreementCount: 0, firstPlaceCount: 0, topicsWithAgreement: new Set(), score: 0, perTopic: new Map() };
      aggs.set(token, a);
    }
    return a;
  };

  const rankBonus = (rank: number | null) => (rank === 1 ? 3 : rank === 2 ? 2 : rank === 3 ? 1 : 0.5);

  // Per-topic winner = the agreed quote with the best (lowest) rank in that topic.
  const topicBest: Record<string, { token: string; rank: number }> = {};

  for (const v of verdicts) {
    const q = quoteById.get(v.quote_id);
    if (!q || !v.supported) continue;
    const a = ensure(q.token);
    a.agreementCount += 1;
    a.topicsWithAgreement.add(q.topicKey);
    a.score += rankBonus(v.rank);
    if (v.rank === 1) a.firstPlaceCount += 1;
    if (v.rank != null) {
      const best = topicBest[q.topicKey];
      if (!best || v.rank < best.rank) topicBest[q.topicKey] = { token: q.token, rank: v.rank };
    }
  }

  // Build per-topic detail for every candidate the user agreed with.
  for (const a of aggs.values()) {
    for (const t of MOCK_TOPICS) {
      const quotes = MOCK_QUOTES.filter((q) => q.token === a.token && q.topicKey === t.topicKey)
        .map((q) => {
          const v = verdictByQuote.get(q.id);
          return v ? { quoteId: q.id, text: q.text, supported: v.supported, rank: v.rank, sourceName: q.sourceName, sourceUrl: q.sourceUrl } : null;
        })
        .filter(Boolean) as BallotEntry['perTopic'][number]['quotes'];
      if (quotes.length === 0) continue;
      a.perTopic.set(t.topicKey, {
        topicKey: t.topicKey,
        title: t.title,
        userTopWinner: topicBest[t.topicKey]?.token === a.token,
        quotes,
      });
    }
  }

  const ranked = [...aggs.values()].sort(
    (x, y) => y.score - x.score || y.agreementCount - x.agreementCount || y.firstPlaceCount - x.firstPlaceCount
  );

  const ballot: BallotEntry[] = ranked.map((a, i) => {
    const id = MOCK_IDENTITIES[a.token];
    return {
      rank: i + 1,
      candidateId: id.candidateId,
      name: id.name,
      office: id.office,
      photo: id.photo,
      essentialsUrl: `https://essentials.empowered.vote/politician/${id.candidateId}`,
      evidence: {
        agreementCount: a.agreementCount,
        firstPlaceCount: a.firstPlaceCount,
        topicsWithAgreement: a.topicsWithAgreement.size,
      },
      perTopic: [...a.perTopic.values()],
      score: a.score,
    };
  });

  return { raceId: MOCK_RACE_ID, positionName: mockRaceSummary.positionName, usesRcv: false, ballot };
}
