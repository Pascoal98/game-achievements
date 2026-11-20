import { useState } from 'react';
import BentoTile, { TileSkeleton, TileUnavailable } from './BentoTile';
import { mergeRecentUnlocks } from '../../lib/stats';
import { formatRelativeTime } from '../../lib/format';
import { assetUrl } from '../../lib/library';
import { BASE } from '../../api/steam';

export function UnlockIcon({ src }) {
    const [failed, setFailed] = useState(false);
    if (!src || failed) return <span className="h-10 w-10 flex-shrink-0 rounded-lg bg-bg-elevated" />;
    return <img src={assetUrl(src, BASE)} alt="" width={40} height={40} loading="lazy" onError={() => setFailed(true)} className="h-10 w-10 flex-shrink-0 rounded-lg object-cover" />;
}

export default function RecentUnlocksTile({ summary, gamesById, loading, error, now, onSelect, className }) {
    let content;
    if (loading) content = <TileSkeleton lines={4} />;
    else if (error) content = <TileUnavailable what="recent unlocks" />;
    else {
        const unlocks = mergeRecentUnlocks(summary, gamesById, 5);
        content = unlocks.length === 0 ? (
            <p className="m-0 text-[13px] text-text-muted">No achievements unlocked yet.</p>
        ) : (
            <ul className="-mx-2 m-0 flex list-none flex-col gap-0.5 p-0">
                {unlocks.map(u => (
                    <li key={`${u.appid}-${u.apiname}`}>
                        <button
                            type="button"
                            onClick={() => gamesById[u.appid] && onSelect(gamesById[u.appid])}
                            className="flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left outline-none transition-colors duration-150 ease-out hover:bg-bg-elevated focus-visible:ring-2 focus-visible:ring-accent"
                        >
                            <UnlockIcon src={u.icon} />
                            <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm text-text-bright">{u.display_name}</span>
                                <span className="block truncate font-mono text-xs text-text-muted">{u.gameName} · {formatRelativeTime(u.unlocktime, now)}</span>
                            </span>
                        </button>
                    </li>
                ))}
            </ul>
        );
    }
    return <BentoTile title="Latest unlocks" className={className}>{content}</BentoTile>;
}
