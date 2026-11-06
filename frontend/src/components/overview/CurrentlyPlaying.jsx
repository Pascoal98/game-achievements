import { useState } from 'react';
import BentoTile from './BentoTile';
import { mostRecentlyPlayed } from '../../lib/stats';
import { backdropSource } from '../../lib/library';
import { formatHours, formatRelativeTime } from '../../lib/format';
import { BASE } from '../../api/steam';

export default function CurrentlyPlaying({ games, summary, now, onSelect, className }) {
    const [artFailed, setArtFailed] = useState(false);
    const game = mostRecentlyPlayed(games);
    if (!game) return null;

    const art = backdropSource(game, BASE);
    const item = summary[game.appid];

    return (
        <BentoTile title="Currently playing" className={className}>
            <button
                type="button"
                onClick={() => onSelect(game)}
                className="group relative flex min-h-36 w-full flex-col justify-end overflow-hidden rounded-md bg-bg-surface p-4 text-left outline-none ring-1 ring-accent/35 hover:ring-accent focus-visible:ring-2 focus-visible:ring-accent"
            >
                {art && !artFailed && (
                    <img src={art} alt="" onError={() => setArtFailed(true)} className="absolute inset-0 h-full w-full object-cover opacity-45" />
                )}
                <span className="absolute inset-0 bg-gradient-to-t from-bg-surface via-bg-surface/70 to-transparent" />
                <span className="relative">
                    <span className="block text-[12px] text-text-muted">Last played {formatRelativeTime(game.rtime_last_played, now)}</span>
                    <span className="mt-1 block font-display text-[26px] font-semibold leading-tight text-text-bright">{game.name}</span>
                    <span className="mt-2 flex flex-wrap gap-x-4 text-[13px] tabular-nums text-text">
                        <span>{formatHours(game.playtime_forever)} played</span>
                        {item?.total > 0 && <span>{item.unlocked} of {item.total} achievements</span>}
                    </span>
                </span>
            </button>
        </BentoTile>
    );
}
