import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// App-chrome components must take colour from the semantic tokens in index.css,
// so a palette change is a token change. (The pizza warm-up keeps its own colours.)
const CHROME_FILES = ['src/components/AddressFilterInput.tsx'];

describe('app chrome uses tokens, not hex literals', () => {
  it.each(CHROME_FILES)('%s has no hex colour literals', (file) => {
    const src = readFileSync(resolve(process.cwd(), file), 'utf8');
    expect(src.match(/#[0-9a-fA-F]{6}\b/g) ?? []).toEqual([]);
  });
});
