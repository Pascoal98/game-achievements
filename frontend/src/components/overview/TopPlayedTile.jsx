import BentoTile from './BentoTile';
import { topPlayed } from '../../lib/stats';
import { formatHours } from '../../lib/format';

export default function TopPlayedTile({ games, onSelect, className }) {
    const top = topPlayed(games, 8);
    const max = top[0]?.playtime_forever ?? 0;

    return (
        <BentoTile title="Most played" className={className}>
            {top.length === 0 ? (
                <p className="m-0 text-[13px] text-text-muted">Nothing played yet.</p>
            ) : (
                <ol className="m-0 flex list-none flex-col gap-1 p-0">
                    {top.map(game => (
                        <li key={game.appid}>
                            <button
                                type="button"
                                onClick={() => onSelect(game)}
                                title={`${game.name}: ${formatHours(game.playtime_forever)}`}
                                className="group grid w-full grid-cols-[minmax(0,9rem)_1fr_3.5rem] items-center gap-3 rounded-md px-2 py-1.5 text-left outline-none hover:bg-bg-elevated focus-visible:ring-2 focus-visible:ring-accent"
                            >
                                <span className="truncate text-[13px] text-text group-hover:text-text-bright">{game.name}</span>
                                <span className="h-2 rounded-r-[4px] bg-accent/80 group-hover:bg-accent" style={{ width: `${(game.playtime_forever / max) * 100}%` }} />
                                <span className="text-right text-xs tabular-nums text-text-muted">{formatHours(game.playtime_forever)}</span>
                            </button>
                        </li>
                    ))}
                </ol>
            )}
        </BentoTile>
    );
}
