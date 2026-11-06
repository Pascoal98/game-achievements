// @vitest-environment jsdom
import { test, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import NextToComplete from './NextToComplete';

afterEach(cleanup);

const games = { 1: { appid: 1, name: 'Rocket League' }, 2: { appid: 2, name: 'Sly Cooper' } };
const summary = { 1: { appid: 1, unlocked: 71, total: 88 }, 2: { appid: 2, unlocked: 17, total: 50 }, 3: { appid: 3, unlocked: 1, total: 2 } };

test('lists the closest unfinished games that exist in the library', () => {
    render(<NextToComplete summary={summary} gamesById={games} loading={false} error={null} onSelect={() => {}} />);
    expect(screen.getByRole('heading', { name: 'Next to complete' })).toBeTruthy();
    expect(screen.getAllByRole('button').map(b => b.textContent)).toEqual(
        [expect.stringContaining('Rocket League'), expect.stringContaining('Sly Cooper')]);
    expect(screen.getByText('71 of 88')).toBeTruthy();
});

test('renders nothing when no game qualifies', () => {
    const { container } = render(<NextToComplete summary={{ 1: { appid: 1, unlocked: 88, total: 88 } }} gamesById={games} loading={false} error={null} onSelect={() => {}} />);
    expect(container.innerHTML).toBe('');
});

test('clicking a game opens it', () => {
    const onSelect = vi.fn();
    render(<NextToComplete summary={summary} gamesById={games} loading={false} error={null} onSelect={onSelect} />);
    fireEvent.click(screen.getByText('Rocket League'));
    expect(onSelect).toHaveBeenCalledWith(games[1]);
});
