import { describe, it, expect } from 'vitest';
import { deriveTierScope } from '../raceTier';

const base = { jurisdictionLevel: null, isLocal: false };

describe('deriveTierScope', () => {
  it('prefers explicit backend tier/scope', () => {
    expect(deriveTierScope({ ...base, positionName: 'Anything', tier: 'federal', scope: 'district' }))
      .toEqual({ tier: 'federal', scope: 'district' });
  });

  it('maps Governor to state / statewide', () => {
    expect(deriveTierScope({ ...base, jurisdictionLevel: 'state', positionName: 'Governor' }))
      .toEqual({ tier: 'state', scope: 'statewide' });
  });

  it('maps U.S. Senate to federal / statewide', () => {
    expect(deriveTierScope({ ...base, jurisdictionLevel: 'federal', positionName: 'U.S. Senate' }))
      .toEqual({ tier: 'federal', scope: 'statewide' });
  });

  it('maps U.S. House to federal / district', () => {
    expect(deriveTierScope({ ...base, jurisdictionLevel: 'federal', positionName: 'U.S. House' }))
      .toEqual({ tier: 'federal', scope: 'district' });
  });

  it('maps Mayor to local / citywide', () => {
    expect(deriveTierScope({ ...base, isLocal: true, jurisdictionLevel: 'city', positionName: 'Mayor' }))
      .toEqual({ tier: 'local', scope: 'citywide' });
  });

  it('maps County Commission to local / county', () => {
    expect(deriveTierScope({ ...base, isLocal: true, jurisdictionLevel: 'county', positionName: 'County Commission' }))
      .toEqual({ tier: 'local', scope: 'county' });
  });

  it('maps City Council to local / district', () => {
    expect(deriveTierScope({ ...base, isLocal: true, jurisdictionLevel: 'city', positionName: 'City Common Council' }))
      .toEqual({ tier: 'local', scope: 'district' });
  });
});
