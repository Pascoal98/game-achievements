import { useState, useMemo } from 'react';
import { useAchievements } from '../hooks/useAchievements';
import { coverSources } from '../lib/library';
import { formatHours, formatRelativeTime, formatDate } from '../lib/format';

function AchievementSkeleton() {
    return (
        <div className="flex flex-col gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 rounded-lg px-3 py-2.5">
                    <div className="h-10 w-10 flex-shrink-0 animate-pulse rounded-md bg-bg-surface" />
                    <div className="flex-1 space-y-2">
                        <div className="h-3 w-1/2 animate-pulse rounded bg-bg-surface" />
                        <div className="h-2.5 w-1/3 animate-pulse rounded bg-bg-surface" />
                    </div>
                </div>
            ))}
        </div>
    );
}

function FallbackGlyph({ achieved }) {
    return (
        <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md ${achieved ? 'bg-success-bg' : 'bg-bg-elevated'}`}>
            {achieved
                ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="stroke-success" strokeWidth="2.5"><path d="M20 6 9 17l-5-5" /></svg>
                : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="stroke-text-faint" strokeWidth="2"><rect width="18" height="11" x="3" y="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
            }
        </div>
    );
}

function AchievementIcon({ src, achieved }) {
    const [failed, setFailed] = useState(false);
    if (!src || failed) return <FallbackGlyph achieved={achieved} />;
    return <img src={src} alt="" width={40} height={40} loading="lazy" onError={() => setFailed(true)} className="h-10 w-10 flex-shrink-0 rounded-md" />;
}

// Most recent unlocks first, then locked ones in Steam's own order.
function orderAchievements(achievements) {
    const unlocked = achievements.filter(a => a.achieved).sort((a, b) => b.unlocktime - a.unlocktime);
    return [...unlocked, ...achievements.filter(a => !a.achieved)];
}

function PanelHeader({ game, now, onBack }) {
    const [bannerFailed, setBannerFailed] = useState(false);
    const header = coverSources(game.appid)[1];
    const twoWeeks = game.playtime_2weeks ?? 0;

    return (
        <div className="relative flex-shrink-0">
            <div className="relative h-36 overflow-hidden bg-bg-surface">
                {!bannerFailed && (
                    <img src={header} alt="" onError={() => setBannerFailed(true)} className="h-full w-full object-cover opacity-70" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-bg-app via-bg-app/40 to-transparent" />
            </div>
            <button
                type="button"
                onClick={onBack}
                aria-label="Close"
                className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-text-bright outline-none backdrop-blur hover:bg-black/70 focus-visible:ring-2 focus-visible:ring-accent"
            >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12" /></svg>
            </button>
            <div className="-mt-10 px-6 md:px-8">
                <h2 id="panel-title" className="relative m-0 text-2xl font-semibold leading-tight text-text-bright">{game.name}</h2>
                <dl className="m-0 mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[13px]">
                    <div className="flex gap-1.5"><dt className="text-text-muted">Played</dt><dd className="m-0 tabular-nums text-text">{formatHours(game.playtime_forever)}</dd></div>
                    {twoWeeks > 0 && (
                        <div className="flex gap-1.5"><dt className="text-text-muted">Last 2 weeks</dt><dd className="m-0 tabular-nums text-text">{formatHours(twoWeeks)}</dd></div>
                    )}
                    <div className="flex gap-1.5">
                        <dt className="text-text-muted">{game.rtime_last_played ? 'Last played' : 'Status'}</dt>
                        <dd className="m-0 text-text">{formatRelativeTime(game.rtime_last_played, now)}</dd>
                    </div>
                </dl>
            </div>
        </div>
    );
}

export default function AchievementPanel({ game, now, onBack }) {
    const { data, loading, error } = useAchievements(game?.appid);
    const [search, setSearch] = useState('');

    const visibleAchievements = useMemo(() => {
        if (!data?.achievements) return [];
        const q = search.toLowerCase();
        return orderAchievements(data.achievements).filter(a =>
            a.display_name.toLowerCase().includes(q) ||
            a.description.toLowerCase().includes(q)
        );
    }, [data, search]);

    let body;
    if (loading) {
        body = <div className="px-6 py-4 md:px-8"><AchievementSkeleton /></div>;
    } else if (error) {
        body = <p className="px-6 py-6 text-sm text-error md:px-8">Couldn't load achievements for this game. Close the panel and open the game again to retry.</p>;
    } else if (!data?.has_achievements) {
        body = <p className="px-6 py-6 text-sm text-text-muted md:px-8">{game.name} has no Steam achievements.</p>;
    } else {
        const pct = data.total ? Math.round((data.unlocked / data.total) * 100) : 0;
        body = (
            <>
                <div className="flex-shrink-0 px-6 pb-4 pt-5 md:px-8">
                    <div className="flex items-baseline justify-between">
                        <p className="m-0 text-[13px] text-text-muted">
                            <span className="text-base font-semibold tabular-nums text-text-bright">{data.unlocked}</span> of {data.total} unlocked
                        </p>
                        <span className={`text-sm font-semibold tabular-nums ${pct === 100 ? 'text-success' : 'text-accent-light'}`}>{pct}%</span>
                    </div>
                    <div className="mt-2 h-1.5 rounded-full bg-bg-elevated">
                        <div
                            className={`h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none ${pct === 100 ? 'bg-success' : 'bg-gradient-to-r from-accent to-accent-light'}`}
                            style={{ width: `${pct}%` }}
                        />
                    </div>
                    <input
                        type="search"
                        placeholder="Search achievements"
                        aria-label="Search achievements"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="mt-4 w-full rounded-md border border-border bg-bg-surface px-3 py-1.5 text-xs text-text outline-none focus:border-accent"
                    />
                </div>
                <ul className="m-0 flex-1 list-none overflow-y-auto px-4 pb-8 md:px-6">
                    {visibleAchievements.map(a => (
                        <li key={a.apiname} className={`flex items-center gap-3 rounded-lg px-2 py-2.5 ${a.achieved ? '' : 'opacity-55'}`}>
                            <AchievementIcon src={a.achieved ? a.icon : a.icongray} achieved={Boolean(a.achieved)} />
                            <div className="min-w-0 flex-1">
                                <span className={`block truncate text-[13px] ${a.achieved ? 'text-text-bright' : 'text-text-locked'}`}>{a.display_name}</span>
                                {a.description && <span className="mt-0.5 block truncate text-[11px] text-text-muted">{a.description}</span>}
                            </div>
                            {a.achieved && a.unlocktime > 0 && (
                                <span className="flex-shrink-0 text-[11px] tabular-nums text-text-muted">{formatDate(a.unlocktime)}</span>
                            )}
                        </li>
                    ))}
                    {visibleAchievements.length === 0 && (
                        <li className="px-2 py-4 text-[13px] text-text-muted">No achievements match “{search}”.</li>
                    )}
                </ul>
            </>
        );
    }

    return (
        <div className="flex h-full flex-col">
            <PanelHeader game={game} now={now} onBack={onBack} />
            {body}
        </div>
    );
}
