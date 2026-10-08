import { describe, expect, it } from 'vitest';
import { backupIsDue, describeBackupAge } from './device';

const NOW = Date.parse('2026-03-20T12:00:00.000Z');
const daysAgo = (n: number) => new Date(NOW - n * 24 * 60 * 60 * 1000).toISOString();

describe('backup reminders', () => {
  it('is due when never backed up or older than two weeks', () => {
    expect(backupIsDue(null, NOW)).toBe(true);
    expect(backupIsDue(daysAgo(3), NOW)).toBe(false);
    expect(backupIsDue(daysAgo(14), NOW)).toBe(false);
    expect(backupIsDue(daysAgo(15), NOW)).toBe(true);
  });

  it('describes how long ago the last backup was', () => {
    expect(describeBackupAge(null, NOW)).toBe('Never backed up on this device');
    expect(describeBackupAge(daysAgo(0.2), NOW)).toBe('Last backup: today');
    expect(describeBackupAge(daysAgo(1), NOW)).toBe('Last backup: yesterday');
    expect(describeBackupAge(daysAgo(9), NOW)).toBe('Last backup: 9 days ago');
  });
});
