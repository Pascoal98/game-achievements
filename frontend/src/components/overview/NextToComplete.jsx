import BentoTile, { TileSkeleton } from './BentoTile';
import { nextToComplete } from '../../lib/stats';

// On error this renders nothing: the shelf above already reports that the summary failed.
export default function NextToComplete({ summary, gamesById, loading, error, onSelect, className }) {
    if (loading) return <BentoTile title="Next to complete" className={className}><TileSkeleton /></BentoTile>;
    if (error) return null;

    const items = nextToComplete(summary, 3).filter(item => gamesById[item.appid]);
    if (items.length === 0) return null;

    return (
        <BentoTile title="Next to complete" className={className}>
            <ul className="m-0 flex list-none flex-col gap-1 p-0">
                {items.map(item => {
                    const game = gamesById[item.appid];
                    return (
                        <li key={item.appid}>
                            <button
                                type="button"
                                onClick={() => onSelect(game)}
                                className="w-full rounded-md px-2 py-1.5 text-left outline-none hover:bg-bg-surface focus-visible:ring-2 focus-visible:ring-accent"
                            >
                                <span className="flex items-baseline justify-between gap-3 text-[13.5px]">
                                    <span className="truncate text-text-bright">{game.name}</span>
                                    <span className="flex-shrink-0 tabular-nums text-text-muted">{item.unlocked} of {item.total}</span>
                                </span>
                                <span className="mt-1.5 block h-1.5 rounded-full bg-bg-elevated">
                                    <span className="block h-full rounded-full bg-accent" style={{ width: `${(item.unlocked / item.total) * 100}%` }} />
                                </span>
                            </button>
                        </li>
                    );
                })}
            </ul>
        </BentoTile>
    );
}
