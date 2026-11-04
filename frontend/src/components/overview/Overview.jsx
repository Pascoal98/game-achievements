import { useMemo } from 'react';
import BentoTile, { TileSkeleton } from './BentoTile';
import NowPlayingTile from './NowPlayingTile';
import PlaytimeTile from './PlaytimeTile';
import CompletionTile from './CompletionTile';
import TopPlayedTile from './TopPlayedTile';
import PlatformTile from './PlatformTile';
import RecentUnlocksTile from './RecentUnlocksTile';
import UnlockHeatmapTile from './UnlockHeatmapTile';
import { useNowPlaying } from '../../hooks/useNowPlaying';

export default function Overview({ games, loading, error, summary, summaryLoading, summaryError, now, onSelect }) {
    // Mounted per visit to the tab, so switching back to Overview refreshes what's playing.
    const { nowPlaying, loading: nowPlayingLoading } = useNowPlaying();
    const gamesById = useMemo(() => Object.fromEntries(games.map(g => [g.appid, g])), [games]);

    if (error) return (
        <p className="p-8 text-sm text-error">Couldn't load your library. Check that the backend is running, then reload.</p>
    );

    if (loading) return (
        <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-4 md:p-8">
            {['md:col-span-2 md:row-span-2', '', '', 'md:col-span-2', 'md:col-span-2', 'md:col-span-2'].map((span, i) => (
                <BentoTile key={i} className={`min-h-40 ${span}`}><TileSkeleton /></BentoTile>
            ))}
        </div>
    );

    return (
        <div className="grid auto-rows-min grid-cols-1 gap-4 p-5 md:grid-cols-4 md:p-8">
            <NowPlayingTile
                games={games}
                nowPlaying={nowPlaying}
                loading={nowPlayingLoading}
                summary={summary}
                now={now}
                onSelect={onSelect}
                className="min-h-72 md:col-span-2 md:row-span-2"
            />
            <PlaytimeTile games={games} />
            <CompletionTile summary={summary} loading={summaryLoading} error={summaryError} />
            <PlatformTile games={games} className="md:col-span-2" />
            <TopPlayedTile games={games} onSelect={onSelect} className="md:col-span-2" />
            <RecentUnlocksTile
                summary={summary}
                gamesById={gamesById}
                loading={summaryLoading}
                error={summaryError}
                now={now}
                onSelect={onSelect}
                className="md:col-span-2"
            />
            <UnlockHeatmapTile summary={summary} loading={summaryLoading} error={summaryError} className="md:col-span-4" />
        </div>
    );
}
