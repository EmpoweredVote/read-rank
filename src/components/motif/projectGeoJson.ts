// src/components/motif/projectGeoJson.ts
import type { GeoJsonGeometry } from '../../data/api';

type Ring = number[][];
export type Bbox = [number, number, number, number];

function collectRings(geom: GeoJsonGeometry): Ring[] {
  if (geom.type === 'Polygon') return geom.coordinates as Ring[];
  // MultiPolygon: array of polygons, each an array of rings.
  return (geom.coordinates as number[][][][]).flat() as Ring[];
}

/** Lon/lat bounding box [minX, minY, maxX, maxY] of a geometry. */
export function geometryBbox(geom: GeoJsonGeometry): Bbox {
  const rings = collectRings(geom).filter((r) => r.length > 1);
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const r of rings) for (const [x, y] of r) {
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
  }
  return [minX, minY, maxX, maxY];
}

/**
 * Project a lon/lat geometry to a square SVG viewBox of `size`, preserving
 * aspect ratio with `pad` margin. Equirectangular with a cos(midLat) x-scale.
 * Y is flipped (north is up).
 *
 * Pass `bbox` to project against an explicit extent (so a frame and its child
 * share one projection). When that bbox is antimeridian-shifted (maxX > 180,
 * i.e. the backend ST_ShiftLongitude'd the frame into 0..360), this geometry's
 * negative longitudes are shifted +360 too so a normal-coord child lines up.
 */
export function projectGeoJson(
  geom: GeoJsonGeometry,
  opts: { size?: number; pad?: number; bbox?: Bbox } = {},
): { path: string; viewBox: string } {
  const size = opts.size ?? 60;
  const pad = opts.pad ?? 4;
  const [minX, minY, maxX, maxY] = opts.bbox ?? geometryBbox(geom);
  if (!Number.isFinite(minX)) return { path: '', viewBox: `0 0 ${size} ${size}` };

  const shift = maxX > 180;
  const nx = (x: number) => (shift && x < 0 ? x + 360 : x);

  const rings = collectRings(geom).filter((r) => r.length > 1);
  const midLat = (minY + maxY) / 2;
  const kx = Math.cos((midLat * Math.PI) / 180) || 1;
  const w = (maxX - minX) * kx || 1;
  const h = (maxY - minY) || 1;
  const inner = size - pad * 2;
  const scale = inner / Math.max(w, h);
  const offX = pad + (inner - w * scale) / 2;
  const offY = pad + (inner - h * scale) / 2;
  const px = (x: number) => offX + (nx(x) - minX) * kx * scale;
  const py = (y: number) => offY + (maxY - y) * scale;
  const path = rings
    .map((r) => 'M' + r.map(([x, y]) => `${px(x).toFixed(2)},${py(y).toFixed(2)}`).join('L') + 'Z')
    .join(' ');
  return { path, viewBox: `0 0 ${size} ${size}` };
}
