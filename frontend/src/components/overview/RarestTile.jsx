import BentoTile, { TileSkeleton } from './BentoTile';
import { UnlockIcon } from './RecentUnlocksTile';
import { rarestUnlocks } from '../../lib/stats';
import { formatRarity } from '../../lib/format';

// The achievements fewest Steam players have. Hidden when there's nothing to rank,
// such as an RPCS3-only library or a failed summary (the shelf above already says so).
export default function RarestTile({ summary, gamesById, loading, error, onSelect, className }) {
    if (loading) return <BentoTile title="Rarest achievements" className={className}><TileSkeleton lines={4} /></BentoTile>;
    const rarest = error ? [] : rarestUnlocks(summary, gamesById, 8);
    if (rarest.length === 0) return null;

    return (
        <BentoTile title="Rarest achievements" className={className}>
            <ul className="-mx-2 m-0 grid list-none grid-cols-1 gap-x-8 gap-y-0.5 p-0 lg:grid-cols-2">
                {rarest.map(u => (
                    <li key={`${u.appid}-${u.apiname}`}>
                        <button
                            type="button"
                            onClick={() => gamesById[u.appid] && onSelect(gamesById[u.appid])}
                            className="flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left outline-none transition-colors duration-150 ease-out hover:bg-bg-elevated focus-visible:ring-2 focus-visible:ring-accent"
                        >
                            <UnlockIcon src={u.icon} />
                            <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm text-text-bright">{u.display_name}</span>
                                <span className="block truncate font-mono text-xs text-text-muted">{u.gameName}</span>
                            </span>
                            <span className="flex-shrink-0 font-mono text-sm tabular-nums text-text" title="Share of all Steam players who have it">
                                {formatRarity(u.rarity)}
                            </span>
                        </button>
                    </li>
                ))}
            </ul>
        </BentoTile>
    );
}
