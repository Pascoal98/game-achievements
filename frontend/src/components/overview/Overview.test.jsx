// @vitest-environment jsdom
import { test, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import Overview from './Overview';

afterEach(cleanup);

const games = [{ appid: 1, name: 'Rocket League', source: 'steam', playtime_forever: 600 }];
const summary = { 1: { appid: 1, unlocked: 71, total: 88, unlock_times: [5], recent_unlocks: [] } };

test('the cabinet shows unlocks, the shelf, playtime split and heat map, in that order', () => {
    render(<Overview games={games} loading={false} error={null} summary={summary} summaryLoading={false} summaryError={null} now={10_000} onSelect={() => {}} />);
    expect(screen.getAllByRole('heading').map(h => h.textContent)).toEqual([
        'Latest unlocks', '0 perfect games', 'Where you play', 'When you unlock achievements',
    ]);
});

test('if only the summary fails, the playtime split still renders', () => {
    render(<Overview games={games} loading={false} error={null} summary={{}} summaryLoading={false} summaryError={new Error('502')} now={10_000} onSelect={() => {}} />);
    expect(screen.getByRole('heading', { name: /Where you play/ })).toBeTruthy();
    expect(screen.getAllByText(/Unavailable/).length).toBeGreaterThan(0);
});

test('currently playing comes first, then latest unlocks, then the shelf', () => {
    const played = [{ ...games[0], rtime_last_played: 5 }];
    render(<Overview games={played} loading={false} error={null} summary={summary} summaryLoading={false} summaryError={null} now={10_000} onSelect={() => {}} />);
    expect(screen.getAllByRole('heading').map(h => h.textContent).slice(0, 3)).toEqual(['Currently playing', 'Latest unlocks', '0 perfect games']);
});

test('rarest achievements sit between the shelf and the playtime split', () => {
    const rare = { ...summary, 999: { appid: 999, unlocked: 1, total: 2, rarest: [{ apiname: 'x', display_name: 'X', icon: '', unlocktime: 1, rarity: 1.5 }] } };
    render(<Overview games={games} loading={false} error={null} summary={rare} summaryLoading={false} summaryError={null} now={10_000} onSelect={() => {}} />);
    const headings = screen.getAllByRole('heading').map(h => h.textContent);
    expect(headings.indexOf('Rarest achievements')).toBe(headings.indexOf('Where you play') - 1);
    expect(headings.indexOf('Rarest achievements')).toBeGreaterThan(headings.findIndex(h => /perfect games/.test(h)));
});
