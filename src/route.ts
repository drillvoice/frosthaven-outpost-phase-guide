// Hash routing: #/g/<group>. Today groups are local to the device; later the
// same URL can point at a shared, synced group.
export const DEFAULT_GROUP = 'local';

export function sanitizeGroup(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
}

export function groupFromHash(hash: string): string | null {
  const m = /^#\/g\/([^/?#]+)/.exec(hash);
  if (!m) return null;
  return sanitizeGroup(decodeURIComponent(m[1])) || null;
}

export function hashForGroup(group: string): string {
  return `#/g/${encodeURIComponent(group)}`;
}
