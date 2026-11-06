// @vitest-environment jsdom
import { test, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import CurrentlyPlaying from './CurrentlyPlaying';

afterEach(cleanup);

const DAY = 86_400;
const now = 100 * DAY * 1000;
const sly = { appid: 'rpcs3-BCES01284', name: 'Sly Cooper: Thieves in Time', source: 'rpcs3', playtime_forever: 881, rtime_last_played: 100 * DAY - 3600, backdrop_url: null };
const rl = { appid: 252950, name: 'Rocket League', source: 'steam', playtime_forever: 32_046, rtime_last_played: 90 * DAY };
const summary = { 'rpcs3-BCES01284': { appid: 'rpcs3-BCES01284', unlocked: 17, total: 50 } };

test('shows the most recently played game with when, how long, and its achievements', () => {
    render(<CurrentlyPlaying games={[rl, sly]} summary={summary} now={now} onSelect={() => {}} />);
    expect(screen.getByRole('heading', { name: 'Currently playing' })).toBeTruthy();
    expect(screen.getByText('Sly Cooper: Thieves in Time')).toBeTruthy();
    expect(screen.getByText('Last played 1 hour ago')).toBeTruthy();
    expect(screen.getByText('15h played')).toBeTruthy();
    expect(screen.getByText('17 of 50 achievements')).toBeTruthy();
});

test('clicking it opens that game', () => {
    const onSelect = vi.fn();
    render(<CurrentlyPlaying games={[rl, sly]} summary={summary} now={now} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onSelect).toHaveBeenCalledWith(sly);
});

test('without achievement data it still shows the game, just no achievement count', () => {
    render(<CurrentlyPlaying games={[rl]} summary={{}} now={now} onSelect={() => {}} />);
    expect(screen.getByText('Rocket League')).toBeTruthy();
    expect(screen.queryByText(/achievements$/)).toBeNull();
});

test('renders nothing when no game has been played', () => {
    const { container } = render(<CurrentlyPlaying games={[{ ...rl, rtime_last_played: 0 }]} summary={{}} now={now} onSelect={() => {}} />);
    expect(container.innerHTML).toBe('');
});
