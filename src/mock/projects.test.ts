import { describe, expect, it } from 'vitest';
import { NOW, linkStatus, links } from './projects';

describe('linkStatus', () => {
  const DAY = 86_400_000;
  const at = (offsetDays: number) => new Date(NOW + offsetDays * DAY).toISOString();

  it('is active well before the end date', () => {
    expect(linkStatus({ expiresAt: at(30) })).toBe('active');
  });

  it('warns in the last 7 days', () => {
    expect(linkStatus({ expiresAt: at(3) })).toBe('expiring');
  });

  it('is expired after the end date, and for a date it cannot read', () => {
    expect(linkStatus({ expiresAt: at(-1) })).toBe('expired');
    expect(linkStatus({ expiresAt: 'not a date' })).toBe('expired');
  });

  it('shows revoked even when the date is still in the future', () => {
    expect(linkStatus({ expiresAt: at(30), revokedAt: at(-1) })).toBe('revoked');
  });
});

describe('mock links', () => {
  it('have unique ids and tokens', () => {
    expect(new Set(links.map((l) => l.id)).size).toBe(links.length);
    expect(new Set(links.map((l) => l.token)).size).toBe(links.length);
  });
});
