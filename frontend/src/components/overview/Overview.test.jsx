// @vitest-environment jsdom
import { test, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import Overview from './Overview';

afterEach(cleanup);

const games = [{ appid: 1, name: 'Rocket League', source: 'steam', playtime_forever: 600 }];
const summary = { 1: { appid: 1, unlocked: 71, total: 88, unlock_times: [5], recent_unlocks: [] } };

test('the cabinet shows the shelf, unlocks, next to complete, playtime split and heat map, in that order', () => {
    render(<Overview games={games} loading={false} error={null} summary={summary} summaryLoading={false} summaryError={null} now={10_000} onSelect={() => {}} />);
    expect(screen.getAllByRole('heading').map(h => h.textContent)).toEqual([
        '0 perfect games', 'Latest unlocks', 'Next to complete', 'Where you play · 10h total', 'When you unlock achievements',
    ]);
});

test('if only the summary fails, the playtime split still renders', () => {
    render(<Overview games={games} loading={false} error={null} summary={{}} summaryLoading={false} summaryError={new Error('502')} now={10_000} onSelect={() => {}} />);
    expect(screen.getByRole('heading', { name: /Where you play/ })).toBeTruthy();
    expect(screen.getAllByText(/Unavailable/).length).toBeGreaterThan(0);
});
