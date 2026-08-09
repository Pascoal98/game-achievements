import { useState } from 'react';
import GameList from '../components/GameList';
import AchievementPanel from '../components/AchievementPanel';
import LibraryOverview from '../components/LibraryOverview';
import { useGames } from '../hooks/useGames';
import { useAchievementsSummary } from '../hooks/useAchievementsSummary';

export default function Home() {
    const { games, loading, error } = useGames();
    const { summary, loading: summaryLoading, error: summaryError } = useAchievementsSummary();
    const [selectedGame, setSelectedGame] = useState(null);

    return (
        <div className="flex h-screen bg-bg-app">
            <aside
                className={`w-full flex-shrink-0 flex-col border-r border-border-faint bg-bg-sidebar md:flex md:w-[260px] ${
                    selectedGame ? 'hidden' : 'flex'
                }`}
            >
                <div className="px-4 pb-3 pt-5">
                    <h1 className="m-0 text-sm font-semibold uppercase tracking-wider text-accent">
                        Your library
                    </h1>
                    {!loading && (
                        <p className="m-0 mt-0.5 text-[11px] text-text-faint">
                            {games.length} games
                        </p>
                    )}
                </div>
                <div className="flex flex-1 flex-col overflow-hidden">
                    <GameList
                        games={games}
                        selectedId={selectedGame?.appid}
                        onSelect={setSelectedGame}
                        loading={loading}
                        error={error}
                        summary={summary}
                        summaryLoading={summaryLoading}
                        summaryError={summaryError}
                    />
                </div>
            </aside>

            <main
                className={`relative flex-1 overflow-hidden md:block ${selectedGame ? 'block' : 'hidden'}`}
            >
                {selectedGame ? (
                    <AchievementPanel key={selectedGame.appid} game={selectedGame} onBack={() => setSelectedGame(null)} />
                ) : (
                    <LibraryOverview games={games} summary={summary} summaryLoading={summaryLoading} summaryError={summaryError} />
                )}
            </main>
        </div>
    );
}