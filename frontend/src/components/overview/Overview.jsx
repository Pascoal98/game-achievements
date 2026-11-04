import BentoTile, { TileSkeleton } from './BentoTile';
import PlaytimeTile from './PlaytimeTile';
import CompletionTile from './CompletionTile';
import TopPlayedTile from './TopPlayedTile';
import PlatformTile from './PlatformTile';

export default function Overview({ games, loading, error, summary, summaryLoading, summaryError, onSelect }) {
    if (error) return (
        <p className="p-8 text-sm text-error">Couldn't load your library. Check that the backend is running, then reload.</p>
    );

    if (loading) return (
        <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-4 md:p-8">
            {['md:col-span-2 md:row-span-2', '', '', 'md:col-span-2', 'md:col-span-2'].map((span, i) => (
                <BentoTile key={i} className={`min-h-40 ${span}`}><TileSkeleton /></BentoTile>
            ))}
        </div>
    );

    return (
        <div className="grid auto-rows-min grid-cols-1 gap-4 p-5 md:grid-cols-4 md:p-8">
            <BentoTile className="min-h-72 md:col-span-2 md:row-span-2" />
            <PlaytimeTile games={games} />
            <CompletionTile summary={summary} loading={summaryLoading} error={summaryError} />
            <PlatformTile games={games} className="md:col-span-2" />
            <TopPlayedTile games={games} onSelect={onSelect} className="md:col-span-2" />
        </div>
    );
}
