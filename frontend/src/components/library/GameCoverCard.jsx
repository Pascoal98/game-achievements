import { useState } from 'react';
import { coverSources, completionOf } from '../../lib/library';
import { isPerfect } from '../../lib/stats';
import { formatRelativeTime } from '../../lib/format';
import { BASE } from '../../api/steam';

function CompletionBar({ pct, perfect, loading }) {
    if (loading) return <div className="mt-2 h-1 animate-pulse rounded-full bg-bg-elevated" />;
    if (pct === null) return null;
    return (
        <div className="mt-2 flex items-center gap-2">
            <div className="h-1 flex-1 rounded-full bg-bg-elevated">
                <div
                    className={`h-full rounded-full ${perfect ? 'bg-success' : 'bg-text-muted'}`}
                    style={{ width: `${pct}%` }}
                />
            </div>
            <span className={`text-[11px] tabular-nums ${perfect ? 'text-success' : 'text-text-muted'}`}>{pct}%</span>
        </div>
    );
}

export default function GameCoverCard({ game, summaryItem, summaryLoading, now, onClick }) {
    const sources = coverSources(game, BASE);
    const [sourceIndex, setSourceIndex] = useState(0);
    const source = sources[sourceIndex];
    const src = source?.url;
    // Landscape art cropped into a portrait frame often loses its logo, so the name goes on top.
    const needsNameOverlay = source !== undefined && !source.portrait;
    // Exact, not the rounded percentage: 199/200 rounds to 100% but is not perfect.
    const perfect = summaryItem !== undefined && isPerfect(summaryItem);

    return (
        <button
            type="button"
            onClick={onClick}
            className="group flex flex-col rounded-[10px] text-left outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-4 focus-visible:ring-offset-bg-app"
        >
            <div className={`relative aspect-[2/3] overflow-hidden rounded-[10px] bg-bg-surface transition duration-200 group-hover:-translate-y-0.5 motion-reduce:transition-none ${
                perfect ? 'ring-2 ring-accent' : 'ring-1 ring-border-faint group-hover:ring-accent/60'
            }`}>
                {src && (
                    <img
                        src={src}
                        alt=""
                        loading="lazy"
                        onError={() => setSourceIndex(i => i + 1)}
                        className="h-full w-full object-cover"
                    />
                )}
                {game.source === 'rpcs3' && (
                    <span className="absolute left-2 top-2 z-10 rounded bg-black/75 px-1.5 py-0.5 text-[10px] font-medium text-text-bright">RPCS3</span>
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
            <CompletionBar pct={completionOf(summaryItem)} perfect={perfect} loading={summaryLoading} />
        </button>
    );
}
