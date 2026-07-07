import { useState } from 'react';
import GameCard from './GameCard';

export default function GameList({ games, selectedId, onSelect, loading, error }) {
    const [search, setSearch] = useState('');

    const filtered = games.filter(g =>
        g.name.toLowerCase().includes(search.toLowerCase())
    );

    if (loading) return (
        <div style={{ padding: '24px 16px', color: '#5a5a6e', fontSize: '13px' }}>
            Loading library...
        </div>
    );
    if (error) return (
        <div style={{ padding: '24px 16px', color: '#f87171', fontSize: '13px' }}>
            Couldn't load games.
        </div>
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ padding: '12px 16px' }}>
                <input
                    type="text"
                    placeholder="Search games..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{
                        width: '100%',
                        background: '#16161f',
                        border: '1px solid #2a2a35',
                        borderRadius: '6px',
                        padding: '7px 10px',
                        color: '#d0d0da',
                        fontSize: '12px',
                        outline: 'none',
                    }}
                />
            </div>
            <div style={{ overflowY: 'auto', flex: 1 }}>
                {filtered.map(game => (
                    <GameCard
                        key={game.appid}
                        game={game}
                        selected={game.appid === selectedId}
                        onClick={() => onSelect(game)}
                    />
                ))}
                {filtered.length === 0 && (
                    <p style={{ padding: '16px', color: '#5a5a6e', fontSize: '13px' }}>
                        No games found.
                    </p>
                )}
            </div>
        </div>
    );
}