import { describe, expect, it } from 'vitest';
import { groupFromHash, hashForGroup, sanitizeGroup } from './route';

describe('route', () => {
  it('parses and sanitises the group from the hash', () => {
    expect(groupFromHash('#/g/theslayers')).toBe('theslayers');
    expect(groupFromHash('#/g/The%20Slayers!')).toBe('the-slayers');
    expect(groupFromHash('')).toBeNull();
    expect(groupFromHash('#/other')).toBeNull();
    expect(sanitizeGroup('  --  ')).toBe('');
    expect(hashForGroup('local')).toBe('#/g/local');
  });
});
