import { useState } from 'react';
import GameList from '../components/GameList';
import AchievementPanel from '../components/AchievementPanel';
import { useGames } from '../hooks/useGames';

export default function Home() {
    const { games, loading, error } = useGames();
    const [selectedGame, setSelectedGame] = useState(null);

    return (
        <div style={{ display: 'flex', height: '100vh', fontFamily: 'system-ui, sans-serif' }}>
            <aside style={{ width: '300px', borderRight: '1px solid #e5e7eb', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '16px', borderBottom: '1px solid #e5e7eb' }}>
                    <h1 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Your library</h1>
                    {!loading && <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#9ca3af' }}>{games.length} games</p>}
                </div>
                <GameList games={games} selectedId={selectedGame?.appid} onSelect={setSelectedGame} loading={loading} error={error} />
            </aside>

            <main style={{ flex: 1, overflow: 'hidden' }}>
                <AchievementPanel game={selectedGame} />
            </main>
        </div>
    );
}