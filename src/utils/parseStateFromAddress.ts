/** Best-effort extraction of a two-letter US state code from a formatted address.
 *  Ported from AddressFilterInput so both the filter and the hub can use it. */
export function parseStateFromAddress(addr: string): string | null {
  if (!addr) return null;
  const m = addr.match(/\b([A-Z]{2})\b\s*\d{5}(?:-\d{4})?/);
  if (m) return m[1];
  const segs = addr.split(',').map((s) => s.trim());
  for (const seg of segs) {
    const sm = seg.match(/^([A-Z]{2})(?:\s+\d{5}.*)?$/);
    if (sm) return sm[1];
  }
  return null;
}
