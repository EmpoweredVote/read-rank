// Stands in for: GET /api/compass/answers and GET /api/compass/selected-topics (signed in).
// Both routes are served, but only to a signed-in user, and local dev is always signed out
// (CLAUDE.md: mock signed-in states here). Used only by `npm run dev`: open any page with
// `?compass=mock` (stays on for that browser tab; `?compass=off` switches it off).
//
// These are the stances of a FICTIONAL user, not of any real person. The topic ids are real
// Compass topics (GET /api/compass/topics, fetched 2026-11-11) so the chart lays real
// candidates' published stances over this made-up user. Candidate data is never mocked.
import type { MyCompass } from '../data/compass';

export const MOCK_MY_COMPASS: MyCompass = {
  answers: [
    { topic_id: '669cac97-66a6-4087-b036-936fbe62efb3', value: 2 }, // housing
    { topic_id: '4938766b-b45a-46e3-93bd-b8b30651271a', value: 4 }, // homelessness
    { topic_id: 'e8dad4a8-eb93-4931-91f5-d8fb5d7dd529', value: 2 }, // healthcare
    { topic_id: 'f7e5678d-dadd-4556-a2fc-446e24642ceb', value: 3 }, // taxes
    { topic_id: 'a22215c3-6693-4bc2-b248-01aebba14570', value: 4 }, // fossil-fuels
    { topic_id: 'f1e44d66-5d27-4b51-b54f-b7ace86f6a3c', value: 2 }, // climate-change (Clean Energy)
    { topic_id: 'd1618b9c-0b9e-45af-b986-bb33d270b8e4', value: 3 }, // trans-athletes
    { topic_id: '666bf03d-81fc-4138-ab15-69ae734c9023', value: 2 }, // ai-regulation (AI Oversight)
  ],
  selected: [],
};
