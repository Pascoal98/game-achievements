import { useState } from 'react';
import BentoTile, { TileSkeleton, TileUnavailable } from './BentoTile';
import { unlockHeatmap } from '../../lib/stats';

// Date#getDay() is Sunday-first; display Monday-first.
const ROWS = [[1, 'Mon'], [2, 'Tue'], [3, 'Wed'], [4, 'Thu'], [5, 'Fri'], [6, 'Sat'], [0, 'Sun']];
const LEVELS = ['bg-bg-elevated', 'bg-seq-1', 'bg-seq-2', 'bg-seq-3', 'bg-seq-4', 'bg-seq-5'];
const hourLabel = (h) => `${String(h).padStart(2, '0')}:00`;

function levelOf(count, max) {
    if (count === 0 || max === 0) return 0;
    return Math.ceil((count / max) * (LEVELS.length - 1));
}

export default function UnlockHeatmapTile({ summary, loading, error, className }) {
    const [hovered, setHovered] = useState(null);

    let content;
    if (loading) content = <TileSkeleton />;
    else if (error) content = <TileUnavailable what="unlock times" />;
    else {
        const grid = unlockHeatmap(summary);
        const max = Math.max(...grid.flat());
        const total = grid.flat().reduce((a, b) => a + b, 0);
        const describe = (label, h, count) => `${label} ${hourLabel(h)}: ${count} ${count === 1 ? 'unlock' : 'unlocks'}`;

        content = total === 0 ? (
            <p className="m-0 text-[13px] text-text-muted">No unlock times yet. Unlock an achievement and it will show up here.</p>
        ) : (
            <>
                <p className="m-0 mb-3 h-5 text-[13px] tabular-nums text-text" aria-live="polite">
                    {hovered ?? `${total.toLocaleString('en-US')} unlocks, in your local time`}
                </p>
                <div className="overflow-x-auto">
                    <div className="grid min-w-[560px] grid-cols-[2.25rem_repeat(24,minmax(0,1fr))] gap-[2px]" role="grid" aria-label="Achievement unlocks by weekday and hour">
                        {ROWS.map(([day, label]) => (
                            <div key={day} role="row" className="contents">
                                <span role="rowheader" className="pr-2 text-[11px] leading-5 text-text-muted">{label}</span>
                                {grid[day].map((count, h) => {
                                    const text = describe(label, h, count);
                                    return (
                                        <div
                                            key={h}
                                            role="gridcell"
                                            tabIndex={count > 0 ? 0 : -1}
                                            aria-label={text}
                                            title={text}
                                            onMouseEnter={() => setHovered(text)}
                                            onMouseLeave={() => setHovered(null)}
                                            onFocus={() => setHovered(text)}
                                            onBlur={() => setHovered(null)}
                                            className={`h-5 rounded-[3px] outline-none focus-visible:ring-2 focus-visible:ring-text-bright ${LEVELS[levelOf(count, max)]}`}
                                        />
                                    );
                                })}
                            </div>
                        ))}
                        <span />
                        {Array.from({ length: 24 }, (_, h) => (
                            <span key={h} className="text-[10px] tabular-nums text-text-muted">{h % 6 === 0 ? hourLabel(h) : ''}</span>
                        ))}
                    </div>
                </div>
                <div className="mt-3 flex items-center justify-end gap-1.5 text-[11px] text-text-muted">
                    Fewer
                    {LEVELS.map(l => <span key={l} className={`h-2.5 w-2.5 rounded-[2px] ${l}`} />)}
                    More
                </div>
            </>
        );
    }
    return <BentoTile title="When you unlock achievements" className={className}>{content}</BentoTile>;
}
