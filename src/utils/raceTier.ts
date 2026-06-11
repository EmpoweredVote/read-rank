import type { RaceTier, RaceScope } from '../data/api';

export type Tier = RaceTier;
export type Scope = RaceScope;

interface DeriveInput {
  positionName: string;
  jurisdictionLevel: string | null;
  isLocal: boolean;
  tier?: Tier;
  scope?: Scope;
}

export function deriveTierScope(race: DeriveInput): { tier: Tier; scope: Scope } {
  const tier = race.tier ?? deriveTier(race);
  const scope = race.scope ?? deriveScope(race.positionName, tier);
  return { tier, scope };
}

function deriveTier(race: DeriveInput): Tier {
  const jl = (race.jurisdictionLevel ?? '').toLowerCase();
  if (/fed|congress|national/.test(jl)) return 'federal';
  if (jl === 'state') return 'state';
  if (race.isLocal || /county|city|municipal|local|township|school|ward/.test(jl)) return 'local';
  const n = race.positionName.toLowerCase();
  if (/u\.?s\.?\s|congress|president/.test(n)) return 'federal';
  return 'state';
}

function deriveScope(positionName: string, tier: Tier): Scope {
  const n = positionName.toLowerCase();
  if (/county commission|board of supervisors|county council|sheriff|\bcounty\b/.test(n)) return 'county';
  if (/mayor|city of /.test(n)) return 'citywide';
  if (/council|ward|\bdistrict\b|house|assembly|representative|senate district/.test(n)) return 'district';
  if (tier === 'local') return 'citywide';
  return 'statewide';
}
