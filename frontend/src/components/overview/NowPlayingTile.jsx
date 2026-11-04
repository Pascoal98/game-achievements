import { useState } from 'react';
import { TileSkeleton } from './BentoTile';
import { coverSources, backdropSource, completionOf } from '../../lib/library';
import { BASE } from '../../api/steam';
import { mostRecentlyPlayed } from '../../lib/stats';
import { formatHours, formatRelativeTime } from '../../lib/format';

// A request failure is deliberately treated like "not in a game": the tile falls back to last played.
function pickFeatured(games, nowPlaying) {
    if (nowPlaying?.appid) {
        const owned = games.find(g => g.appid === nowPlaying.appid);
        return { mode: 'playing', game: owned ?? { appid: nowPlaying.appid, name: nowPlaying.name ?? 'Unknown game' }, owned: Boolean(owned) };
    }
    if (nowPlaying?.name) return { mode: 'playing', game: { appid: null, name: nowPlaying.name }, owned: false };
    const last = mostRecentlyPlayed(games);
    return last ? { mode: 'last', game: last, owned: true } : null;
}

export default function NowPlayingTile({ games, nowPlaying, loading, summary, now, onSelect, className = '' }) {
    const [coverFailed, setCoverFailed] = useState(false);
    const [backdropFailed, setBackdropFailed] = useState(false);
    const frame = `relative flex overflow-hidden rounded-tile border border-neon/40 bg-bg-surface shadow-[0_0_48px_-8px_var(--color-neon-glow)] ${className}`;

    if (loading) return <section className={`${frame} p-6`}><div className="w-full"><TileSkeleton lines={3} /></div></section>;

    const featured = pickFeatured(games, nowPlaying);
    if (!featured) return (
        <section className={`${frame} items-end p-6`}>
            <p className="m-0 text-sm text-text-muted">Nothing played yet. Your most recent game will show up here.</p>
        </section>
    );

    const { mode, game, owned } = featured;
    // The hero frame is portrait, so only portrait art is used there; landscape art goes to the blurred backdrop.
    const cover = game.appid ? coverSources(game, BASE).find(s => s.portrait)?.url : null;
    const header = game.appid ? backdropSource(game, BASE) : null;
    const pct = game.appid ? completionOf(summary[game.appid]) : null;

    const content = (
        <>
            {header && !backdropFailed && (
                <img src={header} alt="" onError={() => setBackdropFailed(true)} className="absolute inset-0 h-full w-full scale-110 object-cover opacity-35 blur-md" />
            )}
            <div className="absolute inset-0 bg-gradient-to-tr from-bg-surface via-bg-surface/85 to-transparent" />
            <div className="relative flex w-full items-end gap-6 p-6">
                {cover && !coverFailed && (
                    <img
                        src={cover}
                        alt=""
                        onError={() => setCoverFailed(true)}
                        className="hidden aspect-[2/3] w-32 flex-shrink-0 rounded-[10px] object-cover shadow-2xl ring-1 ring-white/10 sm:block lg:w-40"
                    />
                )}
                <div className="min-w-0 text-left">
                    {mode === 'playing' ? (
                        <p className="m-0 flex items-center gap-2 text-[13px] font-medium text-neon">
                            <span className="relative flex h-2 w-2">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-neon opacity-75 motion-reduce:animate-none" />
                                <span className="relative inline-flex h-2 w-2 rounded-full bg-neon" />
                            </span>
                            Playing now
                        </p>
                    ) : (
                        <p className="m-0 text-[13px] text-text-muted">Last played {formatRelativeTime(game.rtime_last_played, now)}</p>
                    )}
                    <h2 className="m-0 mt-2 text-balance text-3xl font-semibold leading-tight tracking-tight text-text-bright lg:text-4xl">{game.name}</h2>
                    {owned && (
                        <dl className="m-0 mt-4 flex flex-wrap gap-x-6 gap-y-1 text-[13px]">
                            <div><dt className="text-text-muted">Played</dt><dd className="m-0 mt-0.5 font-medium tabular-nums text-text">{formatHours(game.playtime_forever)}</dd></div>
                            {pct !== null && (
                                <div><dt className="text-text-muted">Achievements</dt><dd className="m-0 mt-0.5 font-medium tabular-nums text-text">{pct}%</dd></div>
                            )}
                        </dl>
                    )}
                </div>
            </div>
        </>
    );

    if (!owned) return <section className={frame}>{content}</section>;
    return (
        <button
            type="button"
            onClick={() => onSelect(game)}
            aria-label={`${mode === 'playing' ? 'Playing now' : 'Last played'}: ${game.name}. View achievements`}
            className={`${frame} text-left outline-none focus-visible:ring-2 focus-visible:ring-neon`}
        >
            {content}
        </button>
    );
}
