# Read & Rank — Design Brief

You are designing **Read & Rank** from a blank canvas.  You have never seen the current product and you should not ask to.  Everything you need is in this brief: the mission, the experience flow, the hard product rules, the brand palette, and the typeface.  The visual language, layout systems, component forms, motion, and signature moments are entirely yours to invent.  We want a design that could not have come from anyone else — committed, distinctive, and executed with precision.  Do not produce a generic card-and-button app with the colors swapped in.

---

## 1. What Read & Rank is

Read & Rank is part of **Empowered Vote**, a nonprofit civic platform whose thesis is: *"In order for our solutions to last, we need to solve shared problems using shared facts."*  The platform is deliberately **anti-partisan**: it serves citizens and candidates, never parties.  Read & Rank is one of its "Inform" pillar tools, alongside Empowered Essentials (deep per-politician dossiers: funding, votes, committees) and Empowered Compass (a tool where users map their own positions across policy issues).

The product teaches **ranked choice voting by having people do it without knowing they are doing it.**  A user picks a real election, then reads real candidate quotes on real issues — completely blind.  No names, no parties, no photos, no sources.  Just the words.  They agree or disagree with each quote, and the quotes they agree with accumulate into a ranked list they can reorder at any time.  When every quote is judged, the reveal: who said what, unmasked against the user's own ranking.  The tagline: **"Blind ranking reveals true alignment."**

The brand promise is **policy over personality**.  The emotional arc is: curiosity → judgment → tension → revelation → insight.

Who uses it: ordinary voters, often on a phone, often skeptical of political apps, with no account required.  The product must feel trustworthy to someone who assumes every political tool is trying to manipulate them.

---

## 2. The experience flow you are designing

Design every screen below.  The flow is fixed; the form of every screen is open.

1. **Arrival / first visit.**  A first-time visitor must understand the premise in seconds and feel invited, not onboarded.  There is an optional low-stakes practice round (lighthearted non-political content, e.g. opinions about pizza) that must never be forced on anyone.  Teaching happens primarily by doing, inside the real experience, through contextual hints at the moment they matter.
2. **Choosing an election.**  Real races with real stakes: office, jurisdiction, election date, number of candidates, the issues covered.  Choosing a race should feel like stepping into an arena, not filling out a form.  Some races genuinely use ranked choice voting; those may carry a quiet factual marker.  Returning users see their progress.
3. **Evaluate + rank (the core loop, one screen).**  The user faces one anonymous quote at a time and renders a verdict: agree or disagree.  Agreed quotes flow into a live ranked list.  **Both of these are first-class on the same screen**: a user may power through all quotes and rank at the end, or reorder continuously as they go — the interface must support both without forcing a mode.  This coexistence is the hardest layout problem in the product, especially on a phone.  Solve it your way.
4. **The ranking model (fixed semantics, open visuals).**  Position in the agreed list maps to tiers: position 1 = **Diamond** (exactly one), position 2 = **Gold** (exactly one), position 3 = **Silver** (exactly one), everything below = **Bronze** (unlimited, still positive).  Disagreed quotes are **Iron** — a separate shelf, not the bottom rung.  Iron means "I rejected this," and the design must make Iron-vs-Bronze unmistakable at a glance: Bronze is low-but-positive, Iron is refusal.  Disagreement is reversible (a quote can be recovered from Iron back into the ranking) — undo is a trust feature.  Tiers rebalance automatically as the user reorders.
5. **The reveal (the climax).**  When all quotes are judged and the user is satisfied with their order, the unmasking: each quote gains its speaker — name, office, small photo — and, for the first time anywhere, its source citation with a verification link.  The user's own ranking is the stage; identities land on it.  Pace, drama, and interaction model are yours, but the user should be able to control the pace of discovery if they want to.  After the unmasking: one synthesized, evidence-toned insight sentence (e.g. "All three of your top picks came from one candidate."), and the single place the product ever names its lesson: "What you just did mirrors ranked choice voting."  For races that really use RCV, the design connects this to their actual ballot; for races that do not, it shows what a single-choice ballot would have discarded from their ranking.  Present the contrast; never editorialize.
6. **The summary artifact.**  A candidates-by-issues grid showing the tier the user gave each candidate's quote on each issue — the screenshot-worthy "true alignment" record.  Plus per-candidate links out to Empowered Essentials ("see their full record") and one dismissible, insight-framed invitation to Compass ("Based on what you ranked, housing appears to matter most to you…").  Cross-links appear only after value is delivered, never during the task, and never as modals or nags.

---

## 3. Hard product rules (non-negotiable)

**Blindness is structural.**  Before a quote's reveal, NOTHING on screen may hint at its speaker: no source, no outlet, no venue, no date, no video, no photo, no styling differences between candidates.  Provenance is an identity vector.  During evaluation, trust is signaled generically — the quote is marked as verified, with an explainer of the sourcing methodology one tap away ("we use debate clips, transcripts, official statements, and verified news, in that order").  The absence of a citation is presented as a rule of the game, not a credibility hole.

**Trust becomes specific at the reveal.**  From the reveal onward, every quote carries its full citation and a verification link, styled as a credential — confident, inside the content, never fine-print apologetics.

**Structurally anti-partisan.**  No party names, labels, colors, or framing anywhere, ever — not subtle, not on hover.  Candidates are name + office only.  No red/blue coding.  No design choice may read as scoring one side.

**No dark patterns.**  No guilt, no streaks, no pressure mechanics, no forced tutorials, no login walls (the entire core experience works anonymously).

**Accessibility is a floor, not a feature: WCAG 2.1 AA.**  Body text ≥16px and 4.5:1; UI components 3:1; nothing conveyed by color alone — the five tiers must survive grayscale and colorblindness through icon, label, and structure before hue.  Full keyboard paths for everything, including reordering (swipe/drag must always have button equivalents).  Touch targets ≥44px.  Every animation has a `prefers-reduced-motion` alternative.  Screen readers get live announcements for verdicts, rank changes, and reveals; reveal content is never inaccessible mid-animation.

**Copy rules.**  No em dashes.  Two spaces after periods.  Invitational verbs ("See", "Open", "Compare"), never pressure ("Don't miss", "Unlock").  Evidence-toned, calm, confident.

---

## 4. Brand constants (the only inherited visuals)

**Typeface: Manrope.  Only Manrope** — weights 200 through 800 are available.  No second typeface, no italics for quotes; readability of the quote text is paramount, since the quote is the product's hero content.  Build hierarchy from weight, size, spacing, and case.

**Palette** (these exact colors; how you deploy them is yours):

| Color | Hex | Notes |
|---|---|---|
| Black | `#1c1c1c` | |
| White | `#ffffff` | |
| Coral | `#ff5740` | Only 3.4:1 on white — large text/UI only, or pair with white text 18px+ semibold |
| Teal | `#00657c` | 6.2:1 on white — safe for links and text |
| Light blue | `#59b0c4` | Tint/fill territory |
| Yellow | `#fed12e` | See below |

**Yellow is the "Inform" signature and it whispers.**  It marks Read & Rank as part of the Inform family across Empowered Vote — a thin, recurring accent, never a surface, never a warning.  Physics: black-on-yellow is 11.3:1 (the only approved text-on-yellow pairing); yellow-on-white is 1.5:1, so yellow may never be the sole carrier of meaning on a light surface — it decorates next to an element that already carries the information.  Use it sparingly and deliberately; a user moving between Inform tools should feel the family resemblance without ever noticing the color shouting.

You may design light mode, dark mode, or both (both preferred).  Surfaces, elevation, texture, radii, motion language, iconography: all yours.

---

## 5. Moments worth designing hard

- **The verdict.**  Agreeing or disagreeing with a quote is the most-repeated action in the product.  It deserves a signature: something tactile and satisfying that makes judgment feel consequential and on-the-record, in under half a second, hundreds of times, without getting old.
- **The first agree.**  The instant the ranking comes alive — the user should feel the system's structure (one Diamond, one Gold, one Silver, the rest Bronze) without reading a manual.
- **Iron.**  Rejection needs its own visual temperature.  The metaphor available to you: Diamond/Gold/Silver/Bronze are refined metals; Iron is raw ore, set aside, unrefined — recoverable.
- **The threshold.**  The beat between "I have judged everything" and "show me who they are."  Tension wants a held breath, not a page swap.
- **The unmasking.**  The single biggest payoff.  The user's own ordering becomes the stage on which identities land.
- **The insight.**  One sentence that makes the user feel seen by their own choices.

---

## 6. Edge states the design must handle gracefully

- An issue where only one candidate has a quote (not a fair comparison — exclude or visibly mark incomplete, never pretend).
- A candidate with no Essentials profile (omit the link entirely; no dead-end teasers).
- A quote with no video clip (text citation alone, clean, never apologetic).
- A user who disagrees with everything (the reveal still has to land — an empty ranking with a full Iron shelf is a real outcome).
- 2-candidate races exist but 3–6 candidates is the design center.

---

## 7. Deliverables

1. **A named aesthetic direction** — one committed point of view, stated in a paragraph, with the reasoning tied to this product's mission and emotional arc.  Then execute it consistently; intentionality over intensity.
2. **The design system**: type scale (Manrope only), color deployment, surface/elevation logic, spacing and radius logic, iconography approach, motion language with named curves/durations and the reduced-motion counterpart of every move.
3. **Screen designs** for: arrival/first visit, election choice, the combined evaluate+rank screen (phone AND desktop — the phone solution is the heart of the brief), the reveal sequence, and the summary artifact.  Mobile-first; 375px is the primary canvas.
4. **The signature verdict interaction**, specified precisely enough to build.
5. **The tier visual language**, including the Iron treatment and proof it survives grayscale.
6. **Accessibility notes inline** — focus styles, target sizes, announcement points, contrast ratios for every new pairing you introduce.

Show the work as concrete, buildable specifications (exact values, not vibes), and make at least one choice in this design that nobody would expect.
