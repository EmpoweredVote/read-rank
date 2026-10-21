# Read & Rank — project notes for Claude

Read & Rank shows citizens **blind, de-identified candidate quotes** grouped by topic and lets
them rank them without knowing who said what; identities and full provenance appear only at the
**reveal**.

## Quote curation

Quotes are **not** authored in this repo. They are curated into `essentials.quotes` (ev-accounts
DB) and served to this app via the accounts API. When curating, selecting, or reasoning about
quotes, follow:

- **Principles (the why):** `essentials/docs/QUOTE-CURATION-PRINCIPLES.md` — selection, editing,
  sources, anonymity, the quote↔Compass-stance coupling model, and accountability.
- **Procedure (the how):** the `publish-quotes` skill in
  `on-the-record/.claude/skills/publish-quotes/`.

## Invariants this app relies on

- **The question card is the unit, not the topic.** Each ranking question is its own card,
  and one topic can host several cards. Address a card by `cardKey` / `topics[].key`, read
  through `cardKeyOfTopic` / `revealCardKey` (they fall back to `topicKey` only for pre-card
  data). Never use `topicKey` as an address: it is not unique across cards.
- **Blindness is structural.** The evaluation payload carries only blind quote fields
  (`id`, `text`, `candidateToken`, `topicKey`, `cardKey`) — no source, party, or candidate name.
  See the whitelist rebuild guard `sanitizeRacePayload` in `src/data/api.ts` (called by
  `fetchRaceQuotes`). It is a whitelist: a new payload field is silently dropped unless it is
  added there, and only non-identifying fields belong there. Provenance debuts **per card** as the user reveals — the combined ballot
  grows to include each card once it's ranked, rather than a single whole-race reveal. Ranking
  stays blind because the blind card never shows attribution and `candidateToken` is never
  surfaced in the UI, so a name learned at one card's reveal can't be carried into an unranked
  card's blind quotes.
- **Two text layers.** The blind card shows the de-identified text; the **revealed quote is the
  single source of truth**, identical across reveal / Compass / Essentials. The eventual
  expand-to-full-context ("show-your-work") view is a **post-reveal** feature only — never on the
  blind card (surrounding context is an identity vector).
- **A card needs ≥2 candidate quotes** to be rankable ("a topic with one voice is not a
  comparison" — REDESIGN_SPEC §8).

See also `REDESIGN_SPEC.md`, `DESIGN_BRIEF.md`, `CONTEXT.md`.

## Real data, current code (read before building UI)

Volunteers and designers: build on live public data, never on invented data. Invented data in a
component becomes rework for whoever merges the PR.

- **`npm run dev` with no `.env` reads the live public API** through the dev server's `/api` proxy
  (`vite.config.ts`). No keys are needed. Leave `VITE_API_URL` unset: an absolute value skips the proxy and the browser blocks the calls.
- **Fetch through `src/data/api.ts`.** Never type real-looking names, numbers, dates, quotes or IDs into a
  component, not even as placeholders. Interface copy is fine.
- **If a request fails, say so and stop.** Report the URL and status. Do not swap in invented data.
- **Data the API does not serve yet** goes in one module under `src/mocks/`, shaped like the
  response, starting with `// Stands in for: GET /api/<route> — not yet served by the API`. List it
  in the PR under "Data this needs from the API".
- **Locally you are signed out.** A failed or 401 `/api/auth/session` call in the console is expected.
  Account and user data is off-limits for design work; mock signed-in states under `src/mocks/`.
- **Start from current `main`:** `git fetch origin && git switch -c <branch> origin/main`. Use
  `@empoweredvote/ev-ui` components instead of copying or restyling them.
- **Standalone HTML prototypes** cannot call the API from the page. Fetch real records first
  (`curl https://accounts-api.empowered.vote/api/...`), embed them, and note the date fetched.

The `ev-designer` skill in EmpoweredVote/ev-ui (`plugins/ev-designer/`) has the index of public
routes with sample responses.
