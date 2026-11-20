import { useMemo } from 'react';
import { TileSkeleton } from './BentoTile';
import PerfectShelf from './PerfectShelf';
import CurrentlyPlaying from './CurrentlyPlaying';
import RecentUnlocksTile from './RecentUnlocksTile';
import PlatformTile from './PlatformTile';
import UnlockHeatmapTile from './UnlockHeatmapTile';

// The stage (currently playing, with latest unlocks inside it) leads; DOM order is also the narrow-screen stacking order.
const PAGE = 'mx-auto grid max-w-[1440px] grid-cols-1 gap-14 px-4 pt-2 pb-20 md:px-8';
// minmax(0, …) lets the heat map scroll inside its card instead of widening the row.
const BOTTOM = 'grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2.6fr)]';
const CARD = 'rounded-2xl border border-border bg-bg-surface p-6';

export default function Overview({ games, loading, error, summary, summaryLoading, summaryError, now, liveAppid, onSelect }) {
    const gamesById = useMemo(() => Object.fromEntries(games.map(g => [g.appid, g])), [games]);

    if (error) return (
        <p className="p-8 text-sm text-error">Couldn't load your library. Check that the backend is running, then reload.</p>
    );

    if (loading) return (
        <div className={PAGE}>
            <div className="min-h-[420px] rounded-[20px] bg-bg-surface p-10"><TileSkeleton lines={3} /></div>
            <TileSkeleton lines={3} />
            <div className={BOTTOM}>
                <div className={CARD}><TileSkeleton /></div>
                <div className={CARD}><TileSkeleton /></div>
            </div>
        </div>
    );

    return (
        <div className={PAGE}>
            <CurrentlyPlaying games={games} summary={summary} now={now} liveAppid={liveAppid} onSelect={onSelect}>
                <RecentUnlocksTile
                    summary={summary}
                    gamesById={gamesById}
                    loading={summaryLoading}
                    error={summaryError}
                    now={now}
                    onSelect={onSelect}
                    className="rounded-[14px] border border-border bg-bg-app/85 p-4 pb-2"
                />
            </CurrentlyPlaying>
            <PerfectShelf summary={summary} gamesById={gamesById} loading={summaryLoading} error={summaryError} onSelect={onSelect} />
            <div className={BOTTOM}>
                <PlatformTile games={games} className={CARD} />
                <UnlockHeatmapTile summary={summary} loading={summaryLoading} error={summaryError} className={CARD} />
            </div>
        </div>
    );
}
