import { test, expect } from 'vitest';
import { formatHours, formatRelativeTime, formatDate } from './format';

const NOW = Date.UTC(2026, 10, 4, 12, 0, 0);
const nowSec = NOW / 1000;

test('formatHours uses one decimal under 10h, then grouped whole hours', () => {
    expect([0, 90, 600, 72300].map(formatHours)).toEqual(['0h', '1.5h', '10h', '1,205h']);
});

test('relative time: 0 means never played', () => {
    expect(formatRelativeTime(0, NOW)).toBe('Never played');
});

test('relative time: under a minute is just now', () => {
    expect(formatRelativeTime(nowSec - 5, NOW)).toBe('just now');
});

test('relative time: picks largest whole unit', () => {
    expect(formatRelativeTime(nowSec - 5 * 60, NOW)).toBe('5 minutes ago');
    expect(formatRelativeTime(nowSec - 86400, NOW)).toBe('yesterday');
    expect(formatRelativeTime(nowSec - 21 * 86400, NOW)).toBe('3 weeks ago');
    expect(formatRelativeTime(nowSec - 2 * 365 * 86400, NOW)).toBe('2 years ago');
});

test('formatDate renders a short US date', () => {
    expect(formatDate(nowSec)).toBe('Nov 4, 2026');
});
