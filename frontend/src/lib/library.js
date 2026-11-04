const CDN = 'https://cdn.cloudflare.steamstatic.com/steam/apps';

// Older titles have no vertical library art, so callers walk this list on image error.
export function coverSources(appid) {
    return [`${CDN}/${appid}/library_600x900.jpg`, `${CDN}/${appid}/header.jpg`];
}

export function completionOf(summaryItem) {
    if (!summaryItem?.total) return null;
    return Math.round((summaryItem.unlocked / summaryItem.total) * 100);
}

const COMPARATORS = {
    name: () => (a, b) => a.name.localeCompare(b.name),
    playtime: () => (a, b) => b.playtime_forever - a.playtime_forever,
    // rtime_last_played is 0 for never-played games, which naturally sorts them last.
    lastPlayed: () => (a, b) => (b.rtime_last_played ?? 0) - (a.rtime_last_played ?? 0),
    completion: (summary) => (a, b) =>
        (completionOf(summary[b.appid]) ?? -1) - (completionOf(summary[a.appid]) ?? -1),
};

export function filterAndSortGames(games, summary, { search, sortBy, onlyWithAchievements }) {
    const q = search.toLowerCase();
    let list = games.filter(g => g.name.toLowerCase().includes(q));
    if (onlyWithAchievements) list = list.filter(g => summary[g.appid]?.has_achievements);
    const compare = (COMPARATORS[sortBy] ?? COMPARATORS.playtime)(summary);
    return [...list].sort(compare);
}
