import { useState } from 'react';
import { coverSources, completionOf } from '../../lib/library';
import { formatRelativeTime } from '../../lib/format';

function CompletionBar({ pct, loading }) {
    if (loading) return <div className="mt-2 h-1 animate-pulse rounded-full bg-bg-elevated" />;
    if (pct === null) return null;
    return (
        <div className="mt-2 flex items-center gap-2">
            <div className="h-1 flex-1 rounded-full bg-bg-elevated">
                <div
                    className={`h-full rounded-full ${pct === 100 ? 'bg-success' : 'bg-accent'}`}
                    style={{ width: `${pct}%` }}
                />
            </div>
            <span className={`text-[11px] tabular-nums ${pct === 100 ? 'text-success' : 'text-text-muted'}`}>{pct}%</span>
        </div>
    );
}

export default function GameCoverCard({ game, summaryItem, summaryLoading, now, onClick }) {
    const sources = coverSources(game.appid);
    const [sourceIndex, setSourceIndex] = useState(0);
    const src = sources[sourceIndex];
    // header.jpg is landscape; cropped into a portrait frame its logo is often cut off.
    const needsNameOverlay = sourceIndex > 0;

    return (
        <button
            type="button"
            onClick={onClick}
            className="group flex flex-col rounded-[10px] text-left outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-4 focus-visible:ring-offset-bg-app"
        >
            <div className="relative aspect-[2/3] overflow-hidden rounded-[10px] bg-bg-surface ring-1 ring-border-faint transition duration-200 group-hover:-translate-y-0.5 group-hover:ring-accent/60 motion-reduce:transition-none">
                {src && (
                    <img
                        src={src}
                        alt=""
                        loading="lazy"
                        onError={() => setSourceIndex(i => i + 1)}
                        className="h-full w-full object-cover"
                    />
                )}
                {(needsNameOverlay || !src) && (
                    <div className={`absolute inset-0 flex items-end p-3 ${
                        src ? 'bg-gradient-to-t from-black/85 via-black/20 to-transparent' : 'bg-gradient-to-br from-bg-elevated to-bg-sidebar'
                    }`}>
                        <span className="text-balance text-sm font-semibold leading-snug text-text-bright">{game.name}</span>
                    </div>
                )}
            </div>
            <p className="m-0 mt-2.5 truncate text-[13px] font-medium text-text group-hover:text-text-bright">{game.name}</p>
            <p className="m-0 mt-0.5 text-[11px] text-text-muted">{formatRelativeTime(game.rtime_last_played, now)}</p>
            <CompletionBar pct={completionOf(summaryItem)} loading={summaryLoading} />
        </button>
    );
}
