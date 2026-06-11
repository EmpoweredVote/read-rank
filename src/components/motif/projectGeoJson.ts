// src/components/motif/projectGeoJson.ts
import type { GeoJsonGeometry } from '../../data/api';

type Ring = number[][];

function collectRings(geom: GeoJsonGeometry): Ring[] {
  if (geom.type === 'Polygon') return geom.coordinates as Ring[];
  // MultiPolygon: array of polygons, each an array of rings.
  return (geom.coordinates as number[][][][]).flat() as Ring[];
}

/**
 * Project a lon/lat geometry to a square SVG viewBox of `size`, preserving
 * aspect ratio with `pad` margin. Equirectangular with a cos(midLat) x-scale
 * so shapes are not horizontally stretched. Y is flipped (north is up).
 */
export function projectGeoJson(
  geom: GeoJsonGeometry,
  size = 60,
  pad = 4,
): { path: string; viewBox: string } {
  const rings = collectRings(geom).filter((r) => r.length > 1);
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const r of rings) for (const [x, y] of r) {
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
  }
  const midLat = (minY + maxY) / 2;
  const kx = Math.cos((midLat * Math.PI) / 180) || 1;
  const w = (maxX - minX) * kx || 1;
  const h = (maxY - minY) || 1;
  const inner = size - pad * 2;
  const scale = inner / Math.max(w, h);
  const offX = pad + (inner - w * scale) / 2;
  const offY = pad + (inner - h * scale) / 2;
  const px = (x: number) => offX + (x - minX) * kx * scale;
  const py = (y: number) => offY + (maxY - y) * scale;
  const path = rings
    .map((r) => 'M' + r.map(([x, y]) => `${px(x).toFixed(2)},${py(y).toFixed(2)}`).join('L') + 'Z')
    .join(' ');
  return { path, viewBox: `0 0 ${size} ${size}` };
}
