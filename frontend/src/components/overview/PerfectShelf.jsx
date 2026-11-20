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
            className="group rounded-[10px] text-left outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-app"
        >
            <div className="relative aspect-[2/3] overflow-hidden rounded-[10px] bg-bg-elevated transition-transform duration-200 ease-out group-hover:-translate-y-0.5 motion-reduce:transition-none">
                {src && (
                    <img src={src} alt="" loading="lazy" onError={() => setSourceIndex(i => i + 1)} className="h-full w-full object-cover" />
                )}
                {/* Landscape art cropped to portrait loses its logo, and missing art shows nothing, so name the game. */}
                {!source?.portrait && (
                    <span className={`absolute inset-0 flex items-end p-2 text-left text-xs font-medium leading-tight text-text-bright ${
                        src ? 'bg-gradient-to-t from-black/85 via-black/20 to-transparent' : ''
                    }`}>{game.name}</span>
                )}
            </div>
            <span className="mt-2 flex justify-between font-mono text-xs tabular-nums text-text-muted">
                <span>{item.total} / {item.total}</span>
                {item.unlock_times?.[0] > 0 && <span>{new Date(item.unlock_times[0] * 1000).getFullYear()}</span>}
            </span>
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
            <div className="mb-5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
                <h2 className="m-0 font-display text-[32px] font-medium leading-none tracking-[-0.02em] text-text-bright md:text-[40px]">
                    {perfect.length} perfect {perfect.length === 1 ? 'game' : 'games'}
                </h2>
                {perfect.length > 0 && (
                    <p className="m-0 text-sm text-text">
                        Every achievement earned. {unlocked.toLocaleString('en-US')} unlocked across {plural(games, 'game')}.
                    </p>
                )}
            </div>
            {perfect.length === 0 ? (
                <EmptyShelf summary={summary} gamesById={gamesById} />
            ) : (
                <div className="grid auto-cols-[minmax(120px,200px)] grid-flow-col gap-4 overflow-x-auto pb-1">
                    {shown.map(item => (
                        <ShelfCover key={item.appid} game={gamesById[item.appid]} item={item} onSelect={onSelect} />
                    ))}
                </div>
            )}
        </section>
    );
}
