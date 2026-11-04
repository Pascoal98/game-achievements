// @vitest-environment jsdom
import { test, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
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
