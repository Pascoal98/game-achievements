// @vitest-environment jsdom
import { test, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import RarestTile from './RarestTile';

afterEach(cleanup);

const r = (apiname, rarity) => ({ apiname, display_name: `Ach ${apiname}`, icon: '', unlocktime: 1, rarity });
const summary = { 1: { appid: 1, rarest: [r('a', 12.5), r('b', 0.8)] }, 2: { appid: 2, rarest: [r('c', 3.2)] } };
const gamesById = { 1: { appid: 1, name: 'One' }, 2: { appid: 2, name: 'Two' } };

test('lists your rarest achievements across games, rarest first, with the share of players', () => {
    render(<RarestTile summary={summary} gamesById={gamesById} loading={false} error={null} onSelect={() => {}} />);
    expect(screen.getByRole('heading', { name: 'Rarest achievements' })).toBeTruthy();
    expect(screen.getAllByRole('button').map(b => b.textContent)).toEqual([
        expect.stringMatching(/Ach b.*One.*0\.8%/),
        expect.stringMatching(/Ach c.*Two.*3\.2%/),
        expect.stringMatching(/Ach a.*One.*12\.5%/),
    ]);
});

test('clicking one opens its game', () => {
    const onSelect = vi.fn();
    render(<RarestTile summary={summary} gamesById={gamesById} loading={false} error={null} onSelect={onSelect} />);
    fireEvent.click(screen.getAllByRole('button')[1]);
    expect(onSelect).toHaveBeenCalledWith(gamesById[2]);
});

test('without rarity data, for example an RPCS3-only library, there is no section', () => {
    const { container } = render(<RarestTile summary={{ 'rpcs3-X': { appid: 'rpcs3-X' } }} gamesById={{}} loading={false} error={null} onSelect={() => {}} />);
    expect(container.innerHTML).toBe('');
});
