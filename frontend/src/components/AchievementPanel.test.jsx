// @vitest-environment jsdom
import { test, expect, afterEach, vi } from 'vitest';
import { render, cleanup, screen } from '@testing-library/react';
import AchievementPanel from './AchievementPanel';
import { BASE } from '../api/steam';

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
});

test('RPCS3 trophy icons in the panel load from the backend, not the page origin', async () => {
    const icon = '/rpcs3/images/BCES01284/trophies/NPWR03581_00/1';
    vi.stubGlobal('fetch', vi.fn(async () => ({
        ok: true,
        json: async () => ({
            has_achievements: true,
            unlocked: 1,
            total: 1,
            achievements: [{ apiname: 'NPWR03581_00:1', achieved: 1, display_name: 'Vault', description: '', unlocktime: 5, icon, icongray: icon }],
        }),
    })));
    const game = { appid: 'rpcs3-BCES01284', name: 'Sly', source: 'rpcs3', playtime_forever: 789, rtime_last_played: 0, banner_url: null, backdrop_url: null };
    const { container } = render(<AchievementPanel game={game} now={10_000} onBack={() => {}} />);
    await screen.findByText('Vault');
    const srcs = [...container.querySelectorAll('img')].map(img => img.getAttribute('src'));
    expect(srcs).toContain(`${BASE}${icon}`);
});
