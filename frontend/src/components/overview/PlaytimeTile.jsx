import BentoTile from './BentoTile';
import { playtimeTotals } from '../../lib/stats';
import { formatHours } from '../../lib/format';

export default function PlaytimeTile({ games, className }) {
    const { lifetimeMinutes, twoWeeksMinutes, avgDailyMinutesTwoWeeks } = playtimeTotals(games);

    return (
        <BentoTile title="Time played" className={className}>
            <p className="m-0 text-4xl font-semibold tracking-tight tabular-nums text-text-bright">{formatHours(lifetimeMinutes)}</p>
            <p className="m-0 mt-1 text-xs text-text-muted">across {games.length} games</p>
            <div className="mt-auto pt-5">
                {twoWeeksMinutes > 0 ? (
                    <dl className="m-0 grid grid-cols-2 gap-3 text-[13px]">
                        <div>
                            <dt className="text-text-muted">Last 2 weeks</dt>
                            <dd className="m-0 mt-0.5 font-medium tabular-nums text-text">{formatHours(twoWeeksMinutes)}</dd>
                        </div>
                        <div>
                            <dt className="text-text-muted">Avg/day (last 2 weeks)</dt>
                            <dd className="m-0 mt-0.5 font-medium tabular-nums text-text">{formatHours(avgDailyMinutesTwoWeeks)}</dd>
                        </div>
                    </dl>
                ) : (
                    <p className="m-0 text-[13px] text-text-muted">No play in the last 2 weeks</p>
                )}
            </div>
        </BentoTile>
    );
}
