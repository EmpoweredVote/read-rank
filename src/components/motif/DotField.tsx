// src/components/motif/DotField.tsx
import type { Arrangement } from './resolveMotif';

// Dots imply constituents. `currentColor` lets the parent set the accent token.
const FIELDS: Record<Arrangement, [number, number][]> = {
  full: [
    [13, 13], [25, 11], [38, 14], [49, 13],
    [11, 25], [24, 24], [37, 23], [48, 26],
    [14, 37], [26, 38], [39, 37], [47, 39],
    [18, 49], [31, 50], [44, 48],
  ],
  cluster: [
    [30, 22], [40, 24], [34, 30], [44, 31],
    [28, 33], [38, 37], [46, 39], [33, 41], [42, 45],
  ],
  point: [
    [26, 27], [33, 25], [30, 32], [37, 31],
    [25, 34], [32, 38], [38, 37], [29, 41],
  ],
};

export function DotField({ arrangement }: { arrangement: Arrangement }) {
  return (
    <svg viewBox="0 0 60 60" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
      <g fill="currentColor">
        {FIELDS[arrangement].map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r={1.6} />
        ))}
      </g>
    </svg>
  );
}
