import BentoTile from './BentoTile';
import { platformSplit } from '../../lib/stats';
import { formatHours } from '../../lib/format';

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
                    <p className="m-0 font-display text-5xl font-medium leading-none tracking-[-0.02em] tabular-nums text-text-bright">
                        {formatHours(total)}
                        <span className="font-sans text-sm font-normal tracking-normal text-text-muted"> total</span>
                    </p>
                    <ul className="m-0 mt-6 flex list-none flex-col gap-3 p-0 text-sm">
                        {split.map(p => (
                            <li key={p.key} className="flex justify-between gap-4">
                                <span className="text-text-bright">{p.label}</span>
                                <span className="font-mono text-[13px] tabular-nums text-text">{formatHours(p.minutes)} · {pctOf(p.minutes)}%</span>
                            </li>
                        ))}
                    </ul>
                </>
            )}
        </BentoTile>
    );
}
