import GameCard from './GameCard';

export default function GameList({ games, selectedId, onSelect, loading, error }) {
    if (loading) return <p style={{ padding: '16px', color: '#6b7280' }}>Loading your library...</p>;
    if (error) return <p style={{ padding: '16px', color: '#ef4444' }}>Couldn't load games.</p>;

    return (
        <div style={{ overflowY: 'auto', height: '100%' }}>
            {games.map(game => (
                <GameCard
                    key={game.appid}
                    game={game}
                    selected={game.appid === selectedId}
                    onClick={() => onSelect(game)}
                />
            ))}
        </div>
    );
}