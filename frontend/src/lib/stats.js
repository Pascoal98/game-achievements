const sum = (games, field) => games.reduce((total, g) => total + (g[field] ?? 0), 0);

export function playtimeTotals(games) {
    const twoWeeksMinutes = sum(games, 'playtime_2weeks');
    return {
        lifetimeMinutes: sum(games, 'playtime_forever'),
        twoWeeksMinutes,
        avgDailyMinutesTwoWeeks: twoWeeksMinutes / 14,
    };
}

// One entry per store. Steam's per-device fields are folded into a single Steam total,
// because older hours have no device recorded and would otherwise go missing.
export function platformSplit(games) {
    const split = [{ key: 'steam', label: 'Steam', minutes: sum(games, 'playtime_forever') }];
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
