import { useState, useMemo } from 'react';
import { useAchievements } from '../hooks/useAchievements';
import StatPill from './StatPill';

function AchievementSkeleton() {
    return (
        <div className="flex flex-col gap-1.5">
            {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 rounded-lg border border-border-faint px-3.5 py-2.5">
                    <div className="h-7 w-7 flex-shrink-0 animate-pulse rounded-full bg-bg-surface" />
                    <div className="flex-1 space-y-2">
                        <div className="h-3 w-1/2 animate-pulse rounded bg-bg-surface" />
                        <div className="h-2.5 w-1/4 animate-pulse rounded bg-bg-surface" />
                    </div>
                </div>
            ))}
        </div>
    );
}

export default function AchievementPanel({ game, onBack }) {
    const { data, loading, error } = useAchievements(game?.appid);
    const [search, setSearch] = useState('');

    const filteredAchievements = useMemo(() => {
        if (!data?.achievements) return [];
        const q = search.toLowerCase();
        return data.achievements.filter(a =>
            a.display_name.toLowerCase().includes(q) ||
            a.description.toLowerCase().includes(q)
        );
    }, [data, search]);

    if (loading) return (
        <div className="h-full p-8">
            <AchievementSkeleton />
        </div>
    );

    if (error) return (
        <div className="p-8 text-sm text-error">
            Couldn't load achievements.
        </div>
    );

    if (!data?.has_achievements) return (
        <div className="flex h-full flex-col items-center justify-center gap-2 text-text-muted">
            <button onClick={onBack} className="absolute left-4 top-4 text-xs text-accent md:hidden">
                ← Back to library
            </button>
            <p className="text-sm">{game.name} has no achievements.</p>
        </div>
    );

    const pct = Math.round((data.unlocked / data.total) * 100);
    const locked = data.total - data.unlocked;
    const hours = Math.round(game.playtime_forever / 60 * 10) / 10;

    return (
        <div className="flex h-full flex-col transition-opacity duration-300">
            <div className="border-b border-border-faint bg-bg-app px-8 pb-6 pt-7">
                <button onClick={onBack} className="mb-3 block text-xs text-accent md:hidden">
                    ← Back to library
                </button>
                <div className="mb-5 flex items-center gap-4">
                    <img
                        src={`https://cdn.cloudflare.steamstatic.com/steam/apps/${game.appid}/header.jpg`}
                        alt={game.name}
                        className="h-[45px] w-[120px] flex-shrink-0 rounded-md object-cover"
                        onError={e => { e.target.style.display = 'none'; }}
                    />
                    <div>
                        <h2 className="m-0 text-xl font-semibold text-text-bright">{game.name}</h2>
                        <p className="m-0 mt-0.5 text-[13px] text-text-muted">{hours}h played</p>
                    </div>
                </div>

                <div className="mb-5 grid grid-cols-3 gap-2.5">
                    <StatPill label="Unlocked" value={data.unlocked} colorClassName="text-accent" />
                    <StatPill label="Locked" value={locked} colorClassName="text-text-muted" />
                    <StatPill
                        label="Completion"
                        value={`${pct}%`}
                        colorClassName={pct === 100 ? 'text-success' : 'text-warning'}
                    />
                </div>

                <div className="h-1.5 rounded-full bg-bg-elevated">
                    <div
                        className={`h-full rounded-full transition-all duration-500 ${
                            pct === 100 ? 'bg-success' : 'bg-gradient-to-r from-accent to-accent-light'
                        }`}
                        style={{ width: `${pct}%` }}
                    />
                </div>

                <input
                    type="text"
                    placeholder="Search achievements..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="mt-4 w-full rounded-md border border-border bg-bg-surface px-2.5 py-1.5 text-xs text-text outline-none focus:border-accent"
                />
            </div>

            <div className="flex-1 overflow-y-auto px-8 py-4">
                <div className="flex flex-col gap-1.5">
                    {filteredAchievements.map(a => (
                        <div
                            key={a.apiname}
                            className={`flex items-center gap-3 rounded-lg border px-3.5 py-2.5 ${
                                a.achieved
                                    ? 'border-success-border bg-[#131a1a]'
                                    : 'border-border-faint bg-[#13131a] opacity-60'
                            }`}
                        >
                            <div className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full ${
                                a.achieved ? 'bg-success-bg' : 'bg-bg-elevated'
                            }`}>
                                {a.achieved
                                    ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5"><path d="M20 6 9 17l-5-5" /></svg>
                                    : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#3a3a48" strokeWidth="2"><rect width="18" height="11" x="3" y="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                                }
                            </div>
                            <div className="min-w-0 flex-1">
                                <span className={`block truncate text-[13px] ${a.achieved ? 'text-[#a8d5b5]' : 'text-text-faint'}`}>
                                    {a.display_name}
                                </span>
                                {a.description && (
                                    <span className="mt-0.5 block truncate text-[11px] text-text-faint">
                                        {a.description}
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                    {filteredAchievements.length === 0 && (
                        <p className="px-1 py-4 text-[13px] text-text-muted">No achievements found.</p>
                    )}
                </div>
            </div>
        </div>
    );
}
