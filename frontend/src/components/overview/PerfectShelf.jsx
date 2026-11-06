import { useState } from 'react';
import { TileSkeleton, TileUnavailable } from './BentoTile';
import { perfectGames, nextToComplete, achievementCounts } from '../../lib/stats';
import { coverSources } from '../../lib/library';
import { BASE } from '../../api/steam';

const plural = (n, word) => `${n.toLocaleString('en-US')} ${n === 1 ? word : `${word}s`}`;

function ShelfCover({ game, item, onSelect }) {
    const sources = coverSources(game, BASE);
    const [sourceIndex, setSourceIndex] = useState(0);
    const source = sources[sourceIndex];
    const src = source?.url;

    return (
        <button
            type="button"
            aria-label={game.name}
            onClick={() => onSelect(game)}
            className="group w-[84px] flex-shrink-0 rounded-[3px] text-center outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-surface"
        >
            <div className="relative aspect-[2/3] overflow-hidden rounded-[3px] bg-bg-elevated ring-2 ring-accent transition group-hover:-translate-y-0.5 motion-reduce:transition-none">
                {src && (
                    <img src={src} alt="" loading="lazy" onError={() => setSourceIndex(i => i + 1)} className="h-full w-full object-cover" />
                )}
                {/* Landscape art cropped to portrait loses its logo, and missing art shows nothing, so name the game. */}
                {!source?.portrait && (
                    <span className={`absolute inset-0 flex items-end p-1.5 text-left text-[11px] font-medium leading-tight text-text-bright ${
                        src ? 'bg-gradient-to-t from-black/85 via-black/20 to-transparent' : ''
                    }`}>{game.name}</span>
                )}
            </div>
            <span className="block py-1.5 text-[11px] tabular-nums text-accent">{item.total} / {item.total}</span>
        </button>
    );
}

function EmptyShelf({ summary, gamesById }) {
    const closest = nextToComplete(summary, 1)[0];
    const game = closest && gamesById[closest.appid];
    return (
        <p className="m-0 text-sm text-text-muted">
            No perfect games yet.{game && ` ${game.name} is closest at ${closest.unlocked} of ${closest.total}.`}
        </p>
    );
}

export default function PerfectShelf({ summary, gamesById, loading, error, onSelect, className = '' }) {
    if (loading) return <section className={className}><TileSkeleton lines={3} /></section>;
    if (error) return <section className={className}><TileUnavailable what="achievement totals" /></section>;

    const perfect = perfectGames(summary);
    const { unlocked, games } = achievementCounts(summary);
    const shown = perfect.filter(item => gamesById[item.appid]);

    return (
        <section className={className}>
            <h2 className="m-0 font-display text-[44px] font-medium leading-none text-text-bright">
                <i className="text-accent">{perfect.length}</i> perfect {perfect.length === 1 ? 'game' : 'games'}
            </h2>
            {perfect.length === 0 ? (
                <div className="mt-4"><EmptyShelf summary={summary} gamesById={gamesById} /></div>
            ) : (
                <>
                    <p className="m-0 mt-2 mb-5 text-[13px] text-text-muted">
                        Every achievement earned. {unlocked.toLocaleString('en-US')} unlocked across {plural(games, 'game')}.
                    </p>
                    <div className="flex gap-3 overflow-x-auto rounded-t-md border-b-[6px] border-accent bg-bg-surface px-3.5 pt-3.5">
                        {shown.map(item => (
                            <ShelfCover key={item.appid} game={gamesById[item.appid]} item={item} onSelect={onSelect} />
                        ))}
                    </div>
                </>
            )}
        </section>
    );
}
