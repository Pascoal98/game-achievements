import { useState } from 'react';
import GameList from '../components/GameList';
import AchievementPanel from '../components/AchievementPanel';
import { useGames } from '../hooks/useGames';

export default function Home() {
    const { games, loading, error } = useGames();
    const [selectedGame, setSelectedGame] = useState(null);

    return (
        <div style={{ display: 'flex', height: '100vh', background: '#0f0f13' }}>
            {/* Sidebar */}
            <aside style={{
                width: '260px',
                flexShrink: 0,
                borderRight: '1px solid #1e1e2e',
                display: 'flex',
                flexDirection: 'column',
                background: '#0c0c11',
            }}>
                <div style={{ padding: '20px 16px 12px' }}>
                    <h1 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#7c6af7', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        Your library
                    </h1>
                    {!loading && (
                        <p style={{ margin: '3px 0 0', fontSize: '11px', color: '#3a3a48' }}>
                            {games.length} games
                        </p>
                    )}
                </div>
                <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    <GameList
                        games={games}
                        selectedId={selectedGame?.appid}
                        onSelect={setSelectedGame}
                        loading={loading}
                        error={error}
                    />
                </div>
            </aside>

            {/* Main panel */}
            <main style={{ flex: 1, overflow: 'hidden' }}>
                <AchievementPanel game={selectedGame} />
            </main>
        </div>
    );
}