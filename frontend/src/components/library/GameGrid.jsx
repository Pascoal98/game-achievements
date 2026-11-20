import { useMemo, useState } from 'react';
import GameCoverCard from './GameCoverCard';
import { filterAndSortGames } from '../../lib/library';

function GridSkeleton() {
    return (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-x-5 gap-y-7">
            {Array.from({ length: 12 }).map((_, i) => (
                <div key={i}>
                    <div className="aspect-[2/3] animate-pulse rounded-[10px] bg-bg-surface" />
                    <div className="mt-3 h-3 w-3/4 animate-pulse rounded bg-bg-surface" />
                </div>
            ))}
        </div>
    );
}

const inputClass = 'h-8 rounded-lg border border-border bg-bg-surface px-3 text-sm text-text-bright outline-none transition-colors duration-150 ease-out placeholder:text-text-muted focus-visible:border-accent';

export default function GameGrid({ games, loading, error, summary, summaryLoading, summaryError, now, onSelect }) {
    const [search, setSearch] = useState('');
    const [sortBy, setSortBy] = useState('playtime');
    const [onlyWithAchievements, setOnlyWithAchievements] = useState(false);
    const summaryUnavailable = summaryLoading || Boolean(summaryError);
    // Completion data arrives later than the library, so say why these controls are disabled.
    const summarySuffix = summaryLoading ? ' (loading…)' : summaryError ? ' (unavailable)' : '';

    const visible = useMemo(
        () => filterAndSortGames(games, summary, { search, sortBy, onlyWithAchievements }),
        [games, summary, search, sortBy, onlyWithAchievements]
    );

    if (error) return (
        <p className="p-8 text-sm text-error">Couldn't load your library. Check that the backend is running, then reload.</p>
    );

    return (
        <div className="mx-auto max-w-[1440px] px-4 pb-12 md:px-8">
            <div className="sticky top-0 z-10 -mx-4 mb-6 flex flex-wrap items-center gap-3 bg-bg-app px-4 py-4 md:-mx-8 md:px-8">
                <input
                    type="search"
                    placeholder="Search"
                    aria-label="Search games"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className={`${inputClass} w-full sm:w-64`}
                />
                <select aria-label="Sort games" value={sortBy} onChange={e => setSortBy(e.target.value)} className={inputClass}>
                    <option value="playtime">Most played</option>
                    <option value="lastPlayed">Recently played</option>
                    <option value="name">Name</option>
                    <option value="completion" disabled={summaryUnavailable}>Completion{summarySuffix}</option>
                </select>
                <label className={`flex items-center gap-2 text-sm ${summaryUnavailable ? 'text-text-faint' : 'text-text'}`}>
                    <input
                        type="checkbox"
                        checked={onlyWithAchievements}
                        disabled={summaryUnavailable}
                        onChange={e => setOnlyWithAchievements(e.target.checked)}
                        className="accent-accent"
                    />
                    Only games with achievements{summarySuffix}
                </label>
                {!loading && (
                    <span className="ml-auto font-mono text-xs tabular-nums text-text-muted">
                        {visible.length === games.length ? `${games.length} games` : `${visible.length} of ${games.length}`}
                    </span>
                )}
            </div>

            {loading ? <GridSkeleton /> : (
                <>
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-x-5 gap-y-7">
                        {visible.map(game => (
                            <GameCoverCard
                                key={game.appid}
                                game={game}
                                summaryItem={summary[game.appid]}
                                summaryLoading={summaryLoading}
                                now={now}
                                onClick={() => onSelect(game)}
                            />
                        ))}
                    </div>
                    {visible.length === 0 && (
                        <p className="py-10 text-center text-sm text-text-muted">No games match “{search}”. Try a shorter search.</p>
                    )}
                </>
            )}
        </div>
    );
}
