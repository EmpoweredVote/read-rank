# Geographic "your ballot" matching

**Date:** 2026-07-10
**Status:** Approved design, ready for implementation
**Repos:** ev-accounts (backend) + read-rank (frontend) — cross-repo, one workstream

## Problem

The race hub decides "Your races" (`isLocal`) by intersecting each race's **candidate roster** with the "representatives at this address" set. For a Bloomington, IN address this misses the voter's **upcoming general U.S. House race** (its 2026 candidates aren't in the current-officeholder set) and is sensitive to primary-vs-general timing — so the hub shows *"We couldn't pinpoint your exact districts"* even though essentials resolves the address fine. Essentials matches by **district geography**; the hub should too.

Verified: `essentials.districts` rows carry `district_type` + `geo_id`; `getRepresentativesByAddress` already resolves every covering district for a point (it derives the county from those rows). `getPlayableRaces` already has each race's `district_type` and `boundary_geoid`. So the geoids needed on both sides already exist.

## Decision

- **`isLocal` = geographic district match, with candidate-roster match as fallback** (OR of the two). Geographic is primary; roster keeps at-large / edge races flagging during rollout.
- A race is a **geographic match** when the user's resolved district GEOID for that race's `district_type` equals the race's `boundary_geoid`.
- Reuse the existing `JurisdictionGeoIds` shape (`congressional`, `state_senate`, `state_house`, `county`, `school_district`).
- No new geometry work; no schema change.
- **Rollout note:** a temporary content lockdown (`read-rank/src/config/liveContent.ts`, parked on branch `readrank-content-lockdown`) serves only the CA Governor race, so this can be unit-tested now but end-to-end verified only after the lockdown lifts.

## District-type → jurisdiction-field mapping

| `district_type` | jurisdiction field |
|---|---|
| `NATIONAL_LOWER` | `congressional` |
| `STATE_UPPER` | `state_senate` |
| `STATE_LOWER` | `state_house` |
| `COUNTY`, `JUDICIAL` | `county` |
| `SCHOOL` | `school_district` |

Statewide/federal-statewide races (Governor, U.S. Senate) have no district geoid → not a geographic match; they still flag via the roster fallback and are already surfaced through the county tier (statewide → all counties).

## Design

### A. Backend — ev-accounts

**A1. `getRepresentativesByAddress` returns the resolved jurisdiction.**
Derive a `JurisdictionGeoIds` from the district rows it already computes (same rows `pickCountyFromDistrictRows` reads): pick each type's `geo_id`. Add `jurisdiction` to `AddressSearchResult` and to the `/essentials/candidates/search` response (next to `county`). Add a `pickJurisdictionFromDistrictRows(rows)` helper mirroring `pickCountyFromDistrictRows`.

**A2. `getPlayableRaces` computes geographic `isLocal` (with roster fallback).**
Accept an optional `jurisdiction?: JurisdictionGeoIds`. Per race, compute:
```
geoMatch = jurisdiction != null
  && userGeoIdForType(jurisdiction, r.district_type) != null
  && userGeoIdForType(jurisdiction, r.district_type) === r.boundary_geoid
isLocal = geoMatch || rosterMatch   // rosterMatch = existing politicianIds intersection
```
Keep the existing `politicianIds` param and roster logic; geographic is OR-ed in.

**A3. `/readrank/races` accepts jurisdiction query params** (`cd`, `sldu`, `sldl`, `county`, `school`), parses them into `JurisdictionGeoIds`, and passes to `getPlayableRaces` alongside `politician_ids`.

**A4. Tests** (`essentialsService.test.ts`, `readrankService.test.ts`): `pickJurisdictionFromDistrictRows` extracts each type; a congressional race whose `boundary_geoid` matches `jurisdiction.congressional` is `isLocal` even with no roster overlap; a non-matching district is not; roster-only match still flags; statewide race (no district geoid) relies on roster.

### B. Frontend — read-rank

**B1. `searchPoliticians` returns `jurisdiction`** (parse from the search response); **`LocationFilter` gains `jurisdiction: JurisdictionGeoIds | null`**, set in `AddressFilterInput` alongside `county`/`state`. Tolerate absence (older backend) → `null`.

**B2. `fetchRaces` passes the jurisdiction** as query params when present; `RaceHub` passes `locationFilter.jurisdiction` through. Grouping (`groupRaces`) is unchanged — it already buckets on `isLocal`, which is now geographically correct, so the "Your races" band populates for the exact districts.

**B3. Types:** add a shared `JurisdictionGeoIds` type in `src/data/api.ts` (mirror the backend fields).

## Testing

- Backend unit tests per A4 (mocked `pool`).
- Frontend: `raceGrouping` unchanged (already covered); `AddressFilterInput`/`api` parse + thread `jurisdiction`; a `RaceHub`/grouping test that a geographically-`isLocal` race lands in "Your races".
- E2E verification deferred until the content lockdown lifts (only CA Governor served today).

## Out of scope

- Loading nationwide county geometry (separate data task).
- Any change to essentials browse or the reveal path.
- Durable race/election publish flags (tracked separately with the lockdown).
