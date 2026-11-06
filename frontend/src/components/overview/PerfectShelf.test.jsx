// @vitest-environment jsdom
import { test, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import PerfectShelf from './PerfectShelf';

afterEach(cleanup);

const games = {
    10: { appid: 10, name: 'Persona 5 Royal', source: 'steam' },
    20: { appid: 20, name: 'ELDEN RING', source: 'steam' },
    30: { appid: 30, name: 'Rocket League', source: 'steam' },
};
const summary = {
    10: { appid: 10, unlocked: 53, total: 53, unlock_times: [100] },
    20: { appid: 20, unlocked: 42, total: 42, unlock_times: [500] },
    30: { appid: 30, unlocked: 71, total: 88, unlock_times: [900] },
    99: { appid: 99, unlocked: 3, total: 3, unlock_times: [999] }, // not in gamesById
};
const renderShelf = (props) => render(
    <PerfectShelf summary={summary} gamesById={games} loading={false} error={null} onSelect={() => {}} {...props} />
);

test('headline, subline, and covers most recently completed first', () => {
    renderShelf();
    expect(screen.getByRole('heading').textContent).toBe('3 perfect games');
    expect(screen.getByText('Every achievement earned. 169 unlocked across 4 games.')).toBeTruthy();
    expect(screen.getAllByRole('button').map(b => b.getAttribute('aria-label'))).toEqual(['ELDEN RING', 'Persona 5 Royal']);
    expect(screen.getByText('42 / 42')).toBeTruthy();
});

test('clicking a cover opens that game', () => {
    const onSelect = vi.fn();
    renderShelf({ onSelect });
    fireEvent.click(screen.getByRole('button', { name: 'Persona 5 Royal' }));
    expect(onSelect).toHaveBeenCalledWith(games[10]);
});

test('with no perfect games it points at the closest one', () => {
    renderShelf({ summary: { 30: summary[30] } });
    expect(screen.getByRole('heading').textContent).toBe('0 perfect games');
    expect(screen.getByText('No perfect games yet. Rocket League is closest at 71 of 88.')).toBeTruthy();
    expect(screen.queryByText(/Every achievement earned/)).toBeNull();
    expect(screen.queryAllByRole('button')).toHaveLength(0);
});

test('one perfect game reads in the singular', () => {
    renderShelf({ summary: { 10: summary[10] } });
    expect(screen.getByRole('heading').textContent).toBe('1 perfect game');
});

test('when the summary fails it says so instead of showing a shelf', () => {
    renderShelf({ summary: {}, error: new Error('502') });
    expect(screen.getByText(/Unavailable/)).toBeTruthy();
});
