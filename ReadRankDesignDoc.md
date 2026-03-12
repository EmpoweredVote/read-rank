Epic Feature: Read & Rank

Summary

Read & Rank introduces players to the principles and benefits of Ranked Choice Voting through a simple, engaging experience.  It allows players to compare candidate responses to real civic issues without party labels or names, ranking them purely on substance.

By emphasizing policy over personality, Read & Rank helps shift democratic power away from political party leadership and closer to the collective priorities of informed citizens.

The system builds upon the Empowered Compass backbone - using players’ calibrated civic priorities to determine which issues to present - while remaining accessible to those who haven’t yet completed their Compass calibration.

The feature runs seasonally, primarily around elections, with a prototype version localized for Bloomington, IN. 

Zipcode:  47405, initially then 47401-47408

This version will be manually populated with questions and candidate responses to test the user experience and ranking system before expanding nationally.


---

Player Flow Overview

1. Entry Point - “Play Read & Rank”

From the Empowered.Vote homepage or hub, the player selects Read & Rank.

If election season mode is active, the feature displays current contests (e.g., “Bloomington Mayor,” “US Senate,” etc.).



2. Compass Integration / Issue Selection

If the player has calibrated their Empowered Compass, the backend selects 3-5 civic issues most relevant to their top priorities.

If not, the system defaults to the most popular regional issues (e.g., housing, homelessness, climate).

Player sees a brief onboarding screen explaining that they’ll be ranking candidate responses anonymously.



3. Question Presentation

A question appears for the selected issue (e.g., “How would you address the affordable housing in Bloomington?”).

Candidate responses (preloaded from Empowered Essentials profiles) are shown anonymously - no names, photos, or party identifiers.



4. Read Phase

Player scrolls or swipes through responses one at a time.

Each answer appears on a card or panel, with a “like” (swipe right / keep) or “dislike” (swipe left / discard) action.



5. Rank Phase

The remaining “liked” responses move into a ranking interface.

Player drags or reorders the cards from most aligned (top) to least aligned (bottom).

The ranking interface should feel tactile and satisfying - drag-and-drop or touch-reorder.



6. Repeat Loop

After completing one issue, the system presents the next until all selected issues are complete.



7. Reveal Phase

Once all issues are ranked, the player sees the Reveal screen:

Candidate names and photos are revealed beside each ranked response.

A Match Summary shows alignment percentages per candidate (similar to a results screen).

Players can tap into each candidate to view a detailed breakdown: where their stances aligned or diverged from the player’s preferences.




8. Reflection & Sharing

Players can share their results privately or publicly (optional social component).

A prompt encourages deeper exploration in Empowered Essentials, comparing full candidate profiles or recalibrating the Compass.





---

Core Features

Anonymous Evaluation: Candidate names and parties hidden until rankings are complete.

Dynamic Issue Selection: Pulled from Compass data or fallback defaults.

Interactive Ranking UI: Swipe-to-discard and drag-to-rank mechanics optimized for mobile.

Reveal & Alignment Analysis: Post-ranking insights showing player-candidate match rates.

Localized Elections Database: Regional configuration (e.g., Bloomington prototype).

Seasonal Activation: Turned on during verified election cycles.



---

User Stories

Selecting Priority Topics

As a player, I want to evaluate candidates based on issues I care about.
Acceptance Criteria:

If calibrated, my top Compass issues determine the topics shown.

If not, the most popular regional issues are used.



Reading & Ranking Candidate Responses

As a player, I want to read anonymized candidate responses and rank them based on alignment with my views.

Acceptance Criteria:

Candidate responses appear without identifiers.

I can swipe left to discard or right to keep, then reorder the kept responses.

My rankings are saved per issue.



Viewing Alignment Results

As a player, I want to see which candidates I align with most after ranking their answers.

Acceptance Criteria:

The reveal screen shows candidates’ names, parties, and photos.

I can view detailed explanations of alignment per issue.

The system computes overall alignment percentages and displays them clearly.



Exploring Candidate Profiles

As a player, I want to learn more about the candidates I align with.

Acceptance Criteria:

Post-reveal, I can jump to their Empowered Essentials profile.

Profiles retain my context (issues ranked, responses viewed).




---

Prototype Scope (Bloomington, IN)

Manual Implementation:

Hardcode 3-5 civic issues (e.g., homelessness, public safety, housing, transportation, climate).

Pre-populate with actual candidate responses from public debates, websites, or interviews.

Build a functional UI that simulates anonymous reading, ranking, and reveal.


Prototype Goals:

Validate UX flow (swipe, rank, reveal).

Test clarity of alignment insights.

Assess emotional impact and comprehension of “blind ranking.”

Gather analytics on drop-off and completion rates.



---

Potential Tasks

Backend

Extend Empowered Compass data model to feed top issues into Read & Rank.

Build response database schema (questions, responses, candidate IDs, region tags).

Implement logic to anonymize candidate identifiers until Reveal.


Frontend

Develop swipe-to-keep/discard and drag-to-rank UI components.

Create Reveal view with dynamic candidate matching visualization.

Design onboarding and completion screens for mobile and web.


Content

Draft standardized questions per issue.

Collect, edit, and fact-check candidate responses.

Tag responses with metadata for Compass integration (issue, region, candidate).


Data & Matching

Implement algorithm comparing player rankings with candidate positions.

Calculate alignment percentages and generate summary reports.


Testing & Feedback

Conduct prototype user testing (focus: comprehension, enjoyment, neutrality).

Iterate based on UX and accessibility findings.



---

Future Launch Goals

Integrate anonymized behavioral analytics for insights on bias reduction.

Add educational overlays explaining how Ranked Choice Voting works.

Optionally gamify (badges, streaks, civic engagement scores).