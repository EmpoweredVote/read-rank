/**
 * TEMPORARY content lockdown — served content is restricted while the full quote
 * catalog is audited ("everything else off for now"). This is a frontend allowlist,
 * not real curation: it filters what the backend returns at the data-fetch choke
 * points (see src/data/api.ts). Blindness/thin-topic invariants are unaffected.
 *
 * To lift the lockdown after the audit: set the allowlists back to `null` (or delete
 * this module and its call sites). Durable, race-level gating is a follow-up task in
 * ev-accounts (there is no race/election publish flag there today).
 */

/** CA Governor — the only race shown while locked down. */
export const DEFAULT_RACE_ID = 'bc936a36-287c-4ffd-abd8-5e4fd798bae5';

/** Only these races are served. `null` = no race restriction (post-audit). */
export const ALLOWED_RACE_IDS: readonly string[] | null = [DEFAULT_RACE_ID];

/** Only these topics are served within a race. `null` = no topic restriction. */
export const ALLOWED_TOPIC_KEYS: readonly string[] | null = [
  'housing',
  'fossil-fuels',
  'healthcare',
  'homelessness',
];

/** True while any content lockdown is in effect (races and/or topics restricted).
 *  Drives the audit banner — it disappears automatically once the allowlists are
 *  set back to null after the audit. */
export function isContentLockdownActive(): boolean {
  return ALLOWED_RACE_IDS != null || ALLOWED_TOPIC_KEYS != null;
}

export function isRaceAllowed(raceId: string): boolean {
  return ALLOWED_RACE_IDS == null || ALLOWED_RACE_IDS.includes(raceId);
}

export function isTopicAllowed(topicKey: string): boolean {
  return ALLOWED_TOPIC_KEYS == null || ALLOWED_TOPIC_KEYS.includes(topicKey.toLowerCase());
}
