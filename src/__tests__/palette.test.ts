import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export function readCss(): string {
  return readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8');
}

/** Return the body of the first rule whose selector line is exactly `selector {`. */
export function block(css: string, selector: string): string {
  const start = css.indexOf(`\n${selector} {`);
  if (start === -1) throw new Error(`selector not found: ${selector}`);
  const open = css.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < css.length; i++) {
    if (css[i] === '{') depth++;
    if (css[i] === '}') { depth--; if (depth === 0) return css.slice(open + 1, i); }
  }
  throw new Error(`unclosed block: ${selector}`);
}

function token(body: string, name: string): string {
  const m = body.match(new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6})\\s*;`));
  if (!m) throw new Error(`token not found or not a 6-digit hex: ${name}`);
  return m[1].toUpperCase();
}

function luminance(hex: string): number {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const LIGHT: Record<string, string> = {
  '--surface-page': '#F0F8FA',
  '--surface-card': '#FFFFFF',
  '--surface-raised': '#F5F9FA',
  '--surface-sunken': '#F7F7F8',
  '--text-ink': '#212326',
  '--text-heading': '#212326',
  '--text-strong': '#2F3237',
  '--text-secondary': '#535964',
  '--text-tertiary': '#5F6570',
  '--text-link': '#00657C',
  '--border-subtle': '#E2EBEF',
  '--border-medium': '#D3D7DE',
  '--border-faint': '#EBEDEF',
  '--action-primary': '#005366',
  '--action-primary-hover': '#003E4D',
};

const DARK: Record<string, string> = {
  '--surface-page': '#131416',
  '--surface-card': '#212326',
  '--surface-raised': '#2F3237',
  '--surface-sunken': '#1A1B1E',
  '--text-ink': '#EBEDEF',
  '--text-heading': '#F7F7F8',
  '--text-strong': '#D3D7DE',
  '--text-secondary': '#B3BBCC',
  '--text-tertiary': '#8F9EBC',
  '--text-link': '#59B0C4',
  '--border-subtle': '#2F3237',
  '--border-medium': '#41454E',
  '--border-faint': '#262729',
  '--action-primary': '#59B0C4',
};

const TEXT = ['--text-ink', '--text-heading', '--text-strong', '--text-secondary', '--text-tertiary', '--text-link'];
const SURFACES = ['--surface-page', '--surface-card', '--surface-raised', '--surface-sunken'];

describe('ev-ui palette tokens', () => {
  const css = readCss();
  const light = block(css, ':root');
  const dark = block(css, '.dark');

  it.each(Object.entries(LIGHT))('light %s = %s', (name, hex) => {
    expect(token(light, name)).toBe(hex);
  });

  it.each(Object.entries(DARK))('dark %s = %s', (name, hex) => {
    expect(token(dark, name)).toBe(hex);
  });

  it.each([['light', LIGHT], ['dark', DARK]] as const)('%s: every text token is >= 4.5:1 on every surface', (_t, set) => {
    for (const t of TEXT) for (const s of SURFACES) {
      const ratio = contrast(set[t], set[s]);
      expect(ratio, `${t} ${set[t]} on ${s} ${set[s]} = ${ratio.toFixed(2)}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('primary button ink is >= 4.5:1 on the primary fill in both themes', () => {
    expect(contrast(token(light, '--action-primary-ink'), LIGHT['--action-primary'])).toBeGreaterThanOrEqual(4.5);
    expect(contrast(token(dark, '--action-primary-ink'), DARK['--action-primary'])).toBeGreaterThanOrEqual(4.5);
  });
});
