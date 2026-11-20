import { useState } from 'react';
import BentoTile, { TileSkeleton, TileUnavailable } from './BentoTile';
import { unlockHeatmap } from '../../lib/stats';

// Date#getDay() is Sunday-first; display Monday-first.
const ROWS = [[1, 'Mon'], [2, 'Tue'], [3, 'Wed'], [4, 'Thu'], [5, 'Fri'], [6, 'Sat'], [0, 'Sun']];
const PLURAL_DAYS = { 0: 'Sundays', 1: 'Mondays', 2: 'Tuesdays', 3: 'Wednesdays', 4: 'Thursdays', 5: 'Fridays', 6: 'Saturdays' };
// Neutral steps so the accent can mark the one busiest hour.
const LEVELS = ['bg-heat-0', 'bg-heat-1', 'bg-heat-2', 'bg-heat-3', 'bg-heat-4', 'bg-heat-5'];
const hourLabel = (h) => `${String(h).padStart(2, '0')}:00`;

// First busiest cell in display order (Monday first), so ties resolve the way the grid reads.
function busiest(grid) {
    let best = null;
    for (const [day] of ROWS) {
        grid[day].forEach((count, h) => {
            if (count > 0 && count > (best?.count ?? 0)) best = { day, h, count };
        });
    }
    return best;
}

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
        const peak = busiest(grid);

        content = total === 0 ? (
            <p className="m-0 text-[13px] text-text-muted">No unlock times yet. Unlock an achievement and it will show up here.</p>
        ) : (
            <>
                <p className="m-0 mb-4 min-h-5 text-sm tabular-nums text-text" aria-live="polite">
                    {hovered ?? <>
                        {total.toLocaleString('en-US')} unlocks in your local time. Busiest on{' '}
                        <span className="text-text-bright">{PLURAL_DAYS[peak.day]} at {hourLabel(peak.h)}</span>
                    </>}
                </p>
                <div className="overflow-x-auto">
                    <div className="grid min-w-[520px] grid-cols-[2.25rem_repeat(24,minmax(0,1fr))] gap-1" role="grid" aria-label="Achievement unlocks by weekday and hour">
                        {ROWS.map(([day, label]) => (
                            <div key={day} role="row" className="contents">
                                <span role="rowheader" className="pr-2 font-mono text-[11px] leading-5 text-text-muted">{label}</span>
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
                                            className={`h-5 rounded outline-none focus-visible:ring-2 focus-visible:ring-text-bright ${
                                                peak.day === day && peak.h === h ? 'bg-accent' : LEVELS[levelOf(count, max)]
                                            }`}
                                        />
                                    );
                                })}
                            </div>
                        ))}
                        <span />
                        {Array.from({ length: 24 }, (_, h) => (
                            <span key={h} className="font-mono text-[11px] tabular-nums text-text-muted">{h % 6 === 0 ? hourLabel(h) : ''}</span>
                        ))}
                    </div>
                </div>
                <div className="mt-4 flex items-center justify-end gap-1.5 text-xs text-text-muted">
                    Fewer
                    {LEVELS.map(l => <span key={l} className={`h-2.5 w-2.5 rounded-sm ${l}`} />)}
                    More
                    <span className="ml-3 h-2.5 w-2.5 rounded-sm bg-accent" />
                    Busiest
                </div>
            </>
        );
    }
    return <BentoTile title="When you unlock achievements" className={className}>{content}</BentoTile>;
}
