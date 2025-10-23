/**
 * Normalize shop domain for consistent storage and lookups
 */
export function normalizeShopDomain(s: string): string {
  return s.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
}
