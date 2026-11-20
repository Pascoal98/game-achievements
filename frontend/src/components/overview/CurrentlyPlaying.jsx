import { useState } from 'react';
import { mostRecentlyPlayed } from '../../lib/stats';
import { heroSources } from '../../lib/library';
import { formatHours, formatRelativeTime } from '../../lib/format';
import { BASE } from '../../api/steam';

const DAY_MS = 86_400_000;

// The stage: the game's own art fills it, and `children` (latest unlocks) sits on its right.
// With nothing played yet there is no stage, so the children render on their own.
export default function CurrentlyPlaying({ games, summary, now, onSelect, children }) {
    const [artIndex, setArtIndex] = useState(0);
    const game = mostRecentlyPlayed(games);
    if (!game) return children ?? null;

    const art = heroSources(game, BASE)[artIndex];
    const item = summary[game.appid];
    const pct = item?.total > 0 ? (item.unlocked / item.total) * 100 : null;
    const playedToday = now - game.rtime_last_played * 1000 < DAY_MS;

    return (
        // Without art there is nothing to fill a tall stage, so it becomes a plain card sized to its content.
        <section className={`relative grid overflow-hidden rounded-[20px] bg-bg-surface lg:grid-cols-[minmax(0,1fr)_360px] ${
            art ? 'min-h-[420px]' : 'border border-border'
        }`}>
            {art && <>
                <img src={art} alt="" onError={() => setArtIndex(i => i + 1)} className="absolute inset-0 h-full w-full object-cover object-[center_30%]" />
                <span className="absolute inset-0 bg-[linear-gradient(90deg,rgb(20_20_21/0.92),rgb(20_20_21/0.55)_45%,rgb(20_20_21/0.2)_70%),linear-gradient(0deg,rgb(20_20_21/0.9),rgb(20_20_21/0)_55%)]" />
            </>}
            <div className="relative flex flex-col justify-end p-6 md:p-10">
                <div className="flex items-center gap-2 text-[13px] text-text">
                    {playedToday && <span data-testid="played-today" className="h-2 w-2 rounded-full bg-accent" />}
                    <h2 className="m-0 text-[13px] font-medium text-text-bright">Currently playing</h2>
                    <span aria-hidden="true">·</span>
                    <span>Last played {formatRelativeTime(game.rtime_last_played, now)}</span>
                </div>
                <p className="m-0 mt-2 mb-6 max-w-[12ch] text-balance font-display text-[40px] font-medium leading-none tracking-[-0.03em] text-text-bright md:text-[64px]">
                    {game.name}
                </p>
                <div className="flex flex-wrap gap-x-8 gap-y-2 font-display text-xl font-medium tabular-nums text-text-bright">
                    <span>{formatHours(game.playtime_forever)} played</span>
                    {item?.total > 0 && <span>{item.unlocked} of {item.total} achievements</span>}
                </div>
                {pct !== null && (
                    <div className="mt-6 h-1 w-80 max-w-full rounded-sm bg-text-bright/15">
                        <div className="h-full rounded-sm bg-accent" style={{ width: `${pct}%` }} />
                    </div>
                )}
                <button
                    type="button"
                    onClick={() => onSelect(game)}
                    className="mt-8 h-10 self-start rounded-[10px] bg-text-bright px-5 font-medium text-bg-app shadow-[inset_0_1px_0_rgb(255_255_255/0.4)] outline-none transition-[background-color,transform] duration-150 ease-out hover:bg-white focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-app active:scale-[0.98] motion-reduce:transition-none"
                >
                    Open achievement list
                </button>
            </div>
            {children && <div className="relative p-2 pt-0 lg:p-4">{children}</div>}
        </section>
    );
}
