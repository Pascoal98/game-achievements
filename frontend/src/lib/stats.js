const PLATFORMS = [
    ['windows', 'Windows', 'playtime_windows_forever'],
    ['mac', 'macOS', 'playtime_mac_forever'],
    ['linux', 'Linux', 'playtime_linux_forever'],
    ['deck', 'Steam Deck', 'playtime_deck_forever'],
];

const sum = (games, field) => games.reduce((total, g) => total + (g[field] ?? 0), 0);

export function playtimeTotals(games) {
    const twoWeeksMinutes = sum(games, 'playtime_2weeks');
    return {
        lifetimeMinutes: sum(games, 'playtime_forever'),
        twoWeeksMinutes,
        avgDailyMinutesTwoWeeks: twoWeeksMinutes / 14,
    };
}

// Steam only started attributing playtime per platform in recent years, so older
// hours appear in playtime_forever without a platform; that remainder is shown, not hidden.
export function platformSplit(games) {
    const split = PLATFORMS.map(([key, label, field]) => ({ key, label, minutes: sum(games, field) }));
    const attributed = split.reduce((total, p) => total + p.minutes, 0);
    split.push({ key: 'unattributed', label: 'Not attributed', minutes: Math.max(0, sum(games, 'playtime_forever') - attributed) });
    return split.filter(p => p.minutes > 0);
}

export function topPlayed(games, n) {
    return games
        .filter(g => g.playtime_forever > 0)
        .sort((a, b) => b.playtime_forever - a.playtime_forever)
        .slice(0, n);
}

export function mostRecentlyPlayed(games) {
    let latest = null;
    for (const g of games) {
        if ((g.rtime_last_played ?? 0) > (latest?.rtime_last_played ?? 0)) latest = g;
    }
    return latest;
}

export function completionTotals(summary) {
    const items = Object.values(summary);
    const unlocked = items.reduce((total, s) => total + s.unlocked, 0);
    const total = items.reduce((t, s) => t + s.total, 0);
    return {
        unlocked,
        total,
        pct: total > 0 ? Math.round((unlocked / total) * 100) : 0,
        perfectGames: items.filter(s => s.total > 0 && s.unlocked === s.total).length,
    };
}

export function mergeRecentUnlocks(summary, gamesById, n) {
    return Object.entries(summary)
        .flatMap(([appid, item]) => (item.recent_unlocks ?? []).map(u => ({
            appid: Number(appid),
            gameName: gamesById[appid]?.name ?? '',
            ...u,
        })))
        .sort((a, b) => b.unlocktime - a.unlocktime)
        .slice(0, n);
}

// Indexed [Date#getDay()][Date#getHours()] in the viewer's local time.
export function unlockHeatmap(summary) {
    const grid = Array.from({ length: 7 }, () => Array(24).fill(0));
    for (const item of Object.values(summary)) {
        for (const t of item.unlock_times ?? []) {
            const d = new Date(t * 1000);
            grid[d.getDay()][d.getHours()] += 1;
        }
    }
    return grid;
}
