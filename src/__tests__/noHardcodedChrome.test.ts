/// <reference types="node" />
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// App-chrome components must take colour from the semantic tokens in index.css,
// so a palette change is a token change. (The pizza warm-up keeps its own colours.)
const CHROME_FILES = [
  'src/components/AddressFilterInput.tsx',
  'src/components/AlignmentMark.tsx',
  'src/components/RevealBand.tsx',
  'src/components/BallotLoader.tsx',
  'src/components/RaceBrowse.tsx',
  'src/components/BrowseHeader.tsx',
];

const read = (file: string) => readFileSync(resolve(process.cwd(), file), 'utf8');

describe('app chrome uses tokens, not hex literals', () => {
  it.each(CHROME_FILES)('%s has no hex colour literals', (file) => {
    const src = read(file);
    expect(src.match(/#[0-9a-fA-F]{8}\b/g) ?? []).toEqual([]);
    expect(src.match(/#[0-9a-fA-F]{6}\b/g) ?? []).toEqual([]);
    expect(src.match(/#[0-9a-fA-F]{3}\b/g) ?? []).toEqual([]);
  });

  it.each(CHROME_FILES)('%s has no Tailwind dark: classes (tokens handle dark mode)', (file) => {
    expect(read(file).match(/\bdark:[^\s"'`]*/g) ?? []).toEqual([]);
  });
});
