import BentoTile from './BentoTile';
import { platformSplit } from '../../lib/stats';
import { formatHours } from '../../lib/format';

// Fixed per platform so a platform keeps its colour regardless of which others are present.
const COLORS = {
    steam: 'bg-series-1',
};

export default function PlatformTile({ games, className }) {
    const split = platformSplit(games);
    const total = split.reduce((t, p) => t + p.minutes, 0);
    const pctOf = (minutes) => Math.round((minutes / total) * 100);

    return (
        <BentoTile title="Where you play" className={className}>
            {total === 0 ? (
                <p className="m-0 text-[13px] text-text-muted">No playtime recorded yet.</p>
            ) : (
                <>
                    <div className="flex h-3 gap-0.5 overflow-hidden rounded-full" role="img" aria-label={split.map(p => `${p.label} ${pctOf(p.minutes)}%`).join(', ')}>
                        {split.map(p => (
                            <div
                                key={p.key}
                                title={`${p.label}: ${formatHours(p.minutes)} (${pctOf(p.minutes)}%)`}
                                className={COLORS[p.key]}
                                style={{ width: `${(p.minutes / total) * 100}%` }}
                            />
                        ))}
                    </div>
                    <ul className="m-0 mt-4 flex list-none flex-wrap gap-x-6 gap-y-2 p-0 text-[13px]">
                        {split.map(p => (
                            <li key={p.key} className="flex items-center gap-2">
                                <span className={`h-2.5 w-2.5 rounded-sm ${COLORS[p.key]}`} />
                                <span className="text-text">{p.label}</span>
                                <span className="tabular-nums text-text-muted">{pctOf(p.minutes)}% · {formatHours(p.minutes)}</span>
                            </li>
                        ))}
                    </ul>
                </>
            )}
        </BentoTile>
    );
}
