import BentoTile, { TileSkeleton, TileUnavailable } from './BentoTile';
import { completionTotals } from '../../lib/stats';

export default function CompletionTile({ summary, loading, error, className }) {
    let content;
    if (loading) content = <TileSkeleton />;
    else if (error) content = <TileUnavailable what="achievement totals" />;
    else {
        const { unlocked, total, pct, perfectGames } = completionTotals(summary);
        content = (
            <>
                <p className="m-0 text-4xl font-semibold tracking-tight tabular-nums text-text-bright">{pct}%</p>
                <p className="m-0 mt-1 text-xs tabular-nums text-text-muted">
                    {unlocked.toLocaleString('en-US')} of {total.toLocaleString('en-US')} achievements
                </p>
                <div className="mt-auto pt-5">
                    <div className="h-1.5 rounded-full bg-bg-elevated">
                        <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="m-0 mt-2 text-[13px] text-text">
                        {perfectGames === 1 ? '1 game completed' : `${perfectGames} games completed`}
                    </p>
                </div>
            </>
        );
    }
    return <BentoTile title="Achievements" className={className}>{content}</BentoTile>;
}
