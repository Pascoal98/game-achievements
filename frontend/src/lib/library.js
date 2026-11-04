const CDN = 'https://cdn.cloudflare.steamstatic.com/steam/apps';

// Ordered fallbacks for a game's card art. Steam's portrait cover is missing for older titles,
// and RPCS3 only has a landscape banner; non-portrait art gets a name overlay because cropping cuts its logo.
export function coverSources(game, apiBase) {
    if (game.source === 'rpcs3') {
        return game.banner_url ? [{ url: `${apiBase}${game.banner_url}`, portrait: false }] : [];
    }
    return [
        { url: `${CDN}/${game.appid}/library_600x900.jpg`, portrait: true },
        { url: `${CDN}/${game.appid}/header.jpg`, portrait: false },
    ];
}

export function backdropSource(game, apiBase) {
    if (game.source === 'rpcs3') return game.backdrop_url ? `${apiBase}${game.backdrop_url}` : null;
    return `${CDN}/${game.appid}/header.jpg`;
}

// RPCS3 images are served by the backend under paths like /rpcs3/images/...; in the browser a bare
// path would resolve against the frontend's origin, so it needs the API base in front. Steam URLs are already absolute.
export function assetUrl(src, apiBase) {
    return src && src.startsWith('/') ? `${apiBase}${src}` : src;
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
