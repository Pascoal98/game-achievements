import { useCallback, useState } from 'react';
import GameGrid from '../components/library/GameGrid';
import SlideOver from '../components/SlideOver';
import AchievementPanel from '../components/AchievementPanel';
import Overview from '../components/overview/Overview';
import { useGames } from '../hooks/useGames';
import { useAchievementsSummary } from '../hooks/useAchievementsSummary';

const VIEWS = [
    { id: 'overview', label: 'Overview' },
    { id: 'library', label: 'Library' },
];

export default function Home() {
    const { games, loading, error } = useGames();
    const { summary, loading: summaryLoading, error: summaryError } = useAchievementsSummary();
    const [view, setView] = useState('overview');
    const [selectedGame, setSelectedGame] = useState(null);
    const [panelOpen, setPanelOpen] = useState(false);
    // One timestamp per page load keeps every "x days ago" consistent and render pure.
    const [now] = useState(() => Date.now());

    const openGame = useCallback((game) => {
        setSelectedGame(game);
        setPanelOpen(true);
    }, []);
    // Only close; keeping selectedGame lets the panel content stay visible while it slides out.
    const closePanel = useCallback(() => setPanelOpen(false), []);

    return (
        <div className="flex h-screen flex-col bg-bg-app">
            <header className="flex flex-shrink-0 items-center gap-6 border-b border-border-faint px-5 py-3 md:px-8">
                <h1 className="m-0 text-[15px] font-semibold text-text-bright">Achievements</h1>
                <nav className="flex gap-1 rounded-lg bg-bg-surface p-1" aria-label="Views">
                    {VIEWS.map(v => (
                        <button
                            key={v.id}
                            type="button"
                            onClick={() => setView(v.id)}
                            aria-current={view === v.id ? 'page' : undefined}
                            className={`rounded-md px-3 py-1 text-xs font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-accent ${
                                view === v.id ? 'bg-bg-elevated text-text-bright' : 'text-text-muted hover:text-text'
                            }`}
                        >
                            {v.label}
                        </button>
                    ))}
                </nav>
            </header>

            <main className="relative flex-1 overflow-y-auto">
                {view === 'overview' ? (
                    <Overview
                        games={games}
                        loading={loading}
                        error={error}
                        summary={summary}
                        summaryLoading={summaryLoading}
                        summaryError={summaryError}
                        onSelect={openGame}
                    />
                ) : (
                    <GameGrid
                        games={games}
                        loading={loading}
                        error={error}
                        summary={summary}
                        summaryLoading={summaryLoading}
                        summaryError={summaryError}
                        now={now}
                        onSelect={openGame}
                    />
                )}
            </main>

            <SlideOver open={panelOpen} onClose={closePanel}>
                {selectedGame && (
                    <AchievementPanel key={selectedGame.appid} game={selectedGame} now={now} onBack={closePanel} />
                )}
            </SlideOver>
        </div>
    );
}
