const STATE_NAMES: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia',
  HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa',
  KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri',
  MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey',
  NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio',
  OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
  SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont',
  VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
  DC: 'Washington, D.C.',
};

export function getStateName(abbr: string | null | undefined): string | null {
  if (!abbr) return null;
  return STATE_NAMES[abbr.toUpperCase()] ?? null;
}

/** USPS 2-letter state abbreviation → 2-digit Census state FIPS code. */
export const STATE_FIPS: Record<string, string> = {
  AL: '01', AK: '02', AZ: '04', AR: '05', CA: '06',
  CO: '08', CT: '09', DE: '10', DC: '11', FL: '12',
  GA: '13', HI: '15', ID: '16', IL: '17', IN: '18',
  IA: '19', KS: '20', KY: '21', LA: '22', ME: '23',
  MD: '24', MA: '25', MI: '26', MN: '27', MS: '28',
  MO: '29', MT: '30', NE: '31', NV: '32', NH: '33',
  NJ: '34', NM: '35', NY: '36', NC: '37', ND: '38',
  OH: '39', OK: '40', OR: '41', PA: '42', RI: '44',
  SC: '45', SD: '46', TN: '47', TX: '48', UT: '49',
  VT: '50', VA: '51', WA: '53', WV: '54', WI: '55',
  WY: '56',
};

export function getStateFips(abbr: string | null | undefined): string | null {
  if (!abbr) return null;
  return STATE_FIPS[abbr.toUpperCase()] ?? null;
}

const NAME_TO_ABBREV: Record<string, string> = Object.fromEntries(
  Object.entries(STATE_NAMES)
    .filter(([abbr]) => abbr in STATE_FIPS && abbr !== 'DC')
    .map(([abbr, name]) => [name.toLowerCase(), abbr]),
);

/** Full state name or 2-letter abbreviation (case-insensitive) → USPS abbreviation.
 *  Null for DC and anything unrecognized. */
export function getStateAbbrevFromName(input: string): string | null {
  const t = input.trim().toLowerCase();
  if (!t) return null;
  const upper = t.toUpperCase();
  if (t.length === 2 && upper in STATE_FIPS && upper !== 'DC') return upper;
  return NAME_TO_ABBREV[t] ?? null;
}

/** 2-digit Census state FIPS code → USPS abbreviation (reverse of STATE_FIPS). */
export function getStateAbbrevFromFips(fips: string): string | null {
  const hit = Object.entries(STATE_FIPS).find(([, f]) => f === fips);
  return hit ? hit[0] : null;
}
