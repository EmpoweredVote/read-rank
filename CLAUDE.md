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

- **Blindness is structural.** The evaluation payload carries only blind quote fields
  (`id`, `text`, `candidateToken`, `topicKey`) — no source, party, or candidate name. See the
  rebuild guard in `src/data/api.ts` (`fetchRaceQuotes`).
- **Two text layers.** The blind card shows the de-identified text; the **revealed quote is the
  single source of truth**, identical across reveal / Compass / Essentials. The eventual
  expand-to-full-context ("show-your-work") view is a **post-reveal** feature only — never on the
  blind card (surrounding context is an identity vector).
- **A topic needs ≥2 candidate quotes** to be rankable ("a topic with one voice is not a
  comparison" — REDESIGN_SPEC §8).

See also `REDESIGN_SPEC.md`, `DESIGN_BRIEF.md`, `CONTEXT.md`.
