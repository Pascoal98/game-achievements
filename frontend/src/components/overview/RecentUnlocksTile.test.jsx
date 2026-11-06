// @vitest-environment jsdom
import { test, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import RecentUnlocksTile from './RecentUnlocksTile';
import { BASE } from '../../api/steam';

afterEach(cleanup);

test('RPCS3 unlock icons load from the backend, not the page origin', () => {
    const icon = '/rpcs3/images/BCES01284/trophies/NPWR03581_00/1';
    const summary = { 'rpcs3-BCES01284': { appid: 'rpcs3-BCES01284', recent_unlocks: [{ apiname: 'NPWR03581_00:1', display_name: 'Vault', icon, unlocktime: 5 }] } };
    const { container } = render(
        <RecentUnlocksTile summary={summary} gamesById={{ 'rpcs3-BCES01284': { name: 'Sly' } }} loading={false} error={null} now={10_000} onSelect={() => {}} />
    );
    expect(container.querySelector('img').getAttribute('src')).toBe(`${BASE}${icon}`);
});

test('shows the 5 latest unlocks under "Latest unlocks"', () => {
    const recent_unlocks = Array.from({ length: 7 }, (_, i) => ({ apiname: `a${i}`, display_name: `Ach ${i}`, icon: '', unlocktime: i + 1 }));
    render(<RecentUnlocksTile summary={{ 1: { appid: 1, recent_unlocks } }} gamesById={{ 1: { name: 'G' } }} loading={false} error={null} now={10_000} onSelect={() => {}} />);
    expect(screen.getByRole('heading', { name: 'Latest unlocks' })).toBeTruthy();
    expect(screen.getAllByRole('button').map(b => b.textContent)).toEqual(
        [6, 5, 4, 3, 2].map(i => expect.stringContaining(`Ach ${i}`)));
});
