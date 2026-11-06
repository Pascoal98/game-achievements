import { useMemo } from 'react';
import { TileSkeleton } from './BentoTile';
import PerfectShelf from './PerfectShelf';
import CurrentlyPlaying from './CurrentlyPlaying';
import RecentUnlocksTile from './RecentUnlocksTile';
import PlatformTile from './PlatformTile';
import UnlockHeatmapTile from './UnlockHeatmapTile';

// minmax(0, …) lets the shelf scroll inside its column instead of widening it.
// Rows pair sections of similar height so no column leaves a gap; DOM order is also the narrow-screen stacking order:
// currently playing, latest unlocks, then full-width shelf, playtime and heat map.
const GRID = 'grid grid-cols-1 gap-x-10 gap-y-8 p-5 md:p-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]';

export default function Overview({ games, loading, error, summary, summaryLoading, summaryError, now, onSelect }) {
    const gamesById = useMemo(() => Object.fromEntries(games.map(g => [g.appid, g])), [games]);

    if (error) return (
        <p className="p-8 text-sm text-error">Couldn't load your library. Check that the backend is running, then reload.</p>
    );

    if (loading) return (
        <div className={GRID}>
            {['min-h-48', 'min-h-48', 'lg:col-span-2', 'lg:col-span-2', 'lg:col-span-2'].map((span, i) => (
                <div key={i} className={span}><TileSkeleton /></div>
            ))}
        </div>
    );

    return (
        <div className={GRID}>
            <CurrentlyPlaying games={games} summary={summary} now={now} onSelect={onSelect} />
            <RecentUnlocksTile
                summary={summary}
                gamesById={gamesById}
                loading={summaryLoading}
                error={summaryError}
                now={now}
                onSelect={onSelect}
            />
            <PerfectShelf summary={summary} gamesById={gamesById} loading={summaryLoading} error={summaryError} onSelect={onSelect} className="lg:col-span-2" />
            <PlatformTile games={games} className="lg:col-span-2" />
            <UnlockHeatmapTile summary={summary} loading={summaryLoading} error={summaryError} className="lg:col-span-2" />
        </div>
    );
}
