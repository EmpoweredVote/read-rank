/**
 * Content-lockdown allowlist — a frontend gate that can restrict which races/topics
 * are served (at the data-fetch choke points in src/data/api.ts) while the quote
 * catalog is audited. Blindness/thin-topic invariants are unaffected.
 *
 * CURRENTLY LIFTED (audit complete, 2026-07): both allowlists are `null`, so nothing
 * is filtered and the audit banner auto-hides. To re-lock for a future audit, set
 * ALLOWED_RACE_IDS / ALLOWED_TOPIC_KEYS to the permitted values (e.g. [DEFAULT_RACE_ID]
 * and the topic keys). Durable, race-level gating remains a follow-up in ev-accounts.
 */

/** CA Governor — the no-location default race shown on the hub (RaceHub View 3). */
export const DEFAULT_RACE_ID = 'bc936a36-287c-4ffd-abd8-5e4fd798bae5';

/** Only these races are served. `null` = no race restriction (lockdown lifted). */
export const ALLOWED_RACE_IDS: readonly string[] | null = null;

/** Only these topics are served within a race. `null` = no topic restriction. */
export const ALLOWED_TOPIC_KEYS: readonly string[] | null = null;

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
