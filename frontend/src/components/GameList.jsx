import { useState, useMemo } from 'react';
import GameCard from './GameCard';

function GameCardSkeleton() {
    return (
        <div className="flex items-center gap-3 px-4 py-2.5">
            <div className="h-9 w-9 flex-shrink-0 animate-pulse rounded-md bg-bg-surface" />
            <div className="flex-1 space-y-2">
                <div className="h-3 w-3/4 animate-pulse rounded bg-bg-surface" />
                <div className="h-2.5 w-1/3 animate-pulse rounded bg-bg-surface" />
            </div>
        </div>
    );
}

export default function GameList({ games, selectedId, onSelect, loading, error, summary, summaryLoading }) {
    const [search, setSearch] = useState('');
    const [sortBy, setSortBy] = useState('playtime');
    const [onlyWithAchievements, setOnlyWithAchievements] = useState(false);

    const filtered = useMemo(() => {
        let list = games.filter(g =>
            g.name.toLowerCase().includes(search.toLowerCase())
        );

        if (onlyWithAchievements) {
            list = list.filter(g => summary[g.appid]?.has_achievements);
        }

        list = [...list].sort((a, b) => {
            if (sortBy === 'name') return a.name.localeCompare(b.name);
            if (sortBy === 'completion') {
                const aSummary = summary[a.appid];
                const bSummary = summary[b.appid];
                const aPct = aSummary?.total ? aSummary.unlocked / aSummary.total : -1;
                const bPct = bSummary?.total ? bSummary.unlocked / bSummary.total : -1;
                return bPct - aPct;
            }
            return b.playtime_forever - a.playtime_forever;
        });

        return list;
    }, [games, search, sortBy, onlyWithAchievements, summary]);

    if (loading) return (
        <div className="flex flex-col gap-1 pt-2">
            {Array.from({ length: 8 }).map((_, i) => <GameCardSkeleton key={i} />)}
        </div>
    );
    if (error) return (
        <div className="px-4 py-6 text-[13px] text-error">
            Couldn't load games.
        </div>
    );

    return (
        <div className="flex h-full flex-col">
            <div className="flex flex-col gap-2 px-4 py-3">
                <input
                    type="text"
                    placeholder="Search games..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full rounded-md border border-border bg-bg-surface px-2.5 py-1.5 text-xs text-text outline-none focus:border-accent"
                />
                <select
                    value={sortBy}
                    onChange={e => setSortBy(e.target.value)}
                    className="w-full rounded-md border border-border bg-bg-surface px-2 py-1 text-[11px] text-text outline-none"
                >
                    <option value="playtime">Sort: Playtime</option>
                    <option value="name">Sort: Name</option>
                    <option value="completion" disabled={summaryLoading}>Sort: Completion %</option>
                </select>
                <label className="flex items-center gap-1.5 text-[11px] text-text-muted">
                    <input
                        type="checkbox"
                        checked={onlyWithAchievements}
                        onChange={e => setOnlyWithAchievements(e.target.checked)}
                    />
                    Only games with achievements
                </label>
            </div>
            <div className="flex-1 overflow-y-auto">
                {filtered.map(game => (
                    <GameCard
                        key={game.appid}
                        game={game}
                        selected={game.appid === selectedId}
                        onClick={() => onSelect(game)}
                    />
                ))}
                {filtered.length === 0 && (
                    <p className="px-4 py-4 text-[13px] text-text-muted">
                        No games found.
                    </p>
                )}
            </div>
        </div>
    );
}
