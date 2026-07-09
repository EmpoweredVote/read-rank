import { describe, it, expect } from 'vitest';
import { candidateLines } from '../candidateLines';

describe('candidateLines', () => {
  it('uses title + chamber/district when present', () => {
    expect(candidateLines({ office: 'x', title: 'City Council Member', chamber: 'Salt Lake City', district: 'District 4' }))
      .toEqual({ line2: 'City Council Member', line3: 'Salt Lake City · District 4' });
  });
  it('falls back to office when split fields are absent', () => {
    expect(candidateLines({ office: 'Candidate for Governor' }))
      .toEqual({ line2: 'Candidate for Governor', line3: '' });
  });
  it('drops empty chamber/district segments', () => {
    expect(candidateLines({ office: 'x', title: 'Mayor', chamber: 'Provo', district: '' }))
      .toEqual({ line2: 'Mayor', line3: 'Provo' });
  });
});
