const sum = (games, field) => games.reduce((total, g) => total + (g[field] ?? 0), 0);

const STORES = [
    ['steam', 'Steam'],
    ['rpcs3', 'RPCS3'],
];

// One entry per store. Steam's per-device fields are folded into a single Steam total,
// because older hours have no device recorded and would otherwise go missing.
export function platformSplit(games) {
    return STORES
        .map(([key, label]) => ({
            key,
            label,
            minutes: sum(games.filter(g => (g.source ?? 'steam') === key), 'playtime_forever'),
        }))
        .filter(p => p.minutes > 0);
}

// Steam and RPCS3 use 0 for "never launched", so those never count as the latest.
export function mostRecentlyPlayed(games) {
    let latest = null;
    for (const g of games) {
        if ((g.rtime_last_played ?? 0) > (latest?.rtime_last_played ?? 0)) latest = g;
    }
    return latest;
}

export const isPerfect = (s) => s.total > 0 && s.unlocked === s.total;
// unlock_times is newest first; RPCS3 games can have none, and those sort last.
const completedAt = (s) => s.unlock_times?.[0] ?? 0;

export function perfectGames(summary) {
    return Object.values(summary)
        .filter(isPerfect)
        .sort((a, b) => completedAt(b) - completedAt(a));
}

export function nextToComplete(summary, n) {
    return Object.values(summary)
        .filter(s => s.total > 0 && s.unlocked > 0 && s.unlocked < s.total)
        .sort((a, b) => (b.unlocked / b.total - a.unlocked / a.total) || ((a.total - a.unlocked) - (b.total - b.unlocked)))
        .slice(0, n);
}

export function achievementCounts(summary) {
    const items = Object.values(summary);
    return {
        unlocked: items.reduce((total, s) => total + s.unlocked, 0),
        games: items.filter(s => s.total > 0).length,
    };
}

export function mergeRecentUnlocks(summary, gamesById, n) {
    // Ids come from the items themselves: Steam ids are numbers, RPCS3 ids are strings like "rpcs3-BCES01284".
    return Object.values(summary)
        .flatMap(item => (item.recent_unlocks ?? []).map(u => ({
            appid: item.appid,
            gameName: gamesById[item.appid]?.name ?? '',
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
