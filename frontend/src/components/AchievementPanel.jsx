import { useAchievements } from '../hooks/useAchievements';

export default function AchievementPanel({ game }) {
    const { data, loading, error } = useAchievements(game?.appid);

    if (!game) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9ca3af' }}>
            Select a game to see achievements
        </div>
    );

    if (loading) return <p style={{ padding: '24px', color: '#6b7280' }}>Loading achievements...</p>;
    if (error) return <p style={{ padding: '24px', color: '#ef4444' }}>Couldn't load achievements.</p>;
    if (!data?.has_achievements) return (
        <p style={{ padding: '24px', color: '#9ca3af' }}>{game.name} has no achievements.</p>
    );

    const pct = Math.round((data.unlocked / data.total) * 100);

    return (
        <div style={{ padding: '24px', overflowY: 'auto', height: '100%', boxSizing: 'border-box' }}>
            <h2 style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: 600 }}>{game.name}</h2>
            <p style={{ margin: '0 0 16px', color: '#6b7280', fontSize: '14px' }}>
                {data.unlocked} / {data.total} achievements — {pct}%
            </p>

            <div style={{ background: '#e5e7eb', borderRadius: '999px', height: '8px', marginBottom: '24px' }}>
                <div style={{ background: '#3b82f6', width: `${pct}%`, height: '100%', borderRadius: '999px', transition: 'width 0.4s ease' }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {data.achievements.map(a => (
                    <div key={a.apiname} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        background: a.achieved ? '#f0fdf4' : '#f9fafb',
                        border: `1px solid ${a.achieved ? '#bbf7d0' : '#e5e7eb'}`,
                    }}>
                        <span style={{ fontSize: '18px' }}>{a.achieved ? '✅' : '🔒'}</span>
                        <span style={{ fontSize: '14px', color: a.achieved ? '#166534' : '#6b7280' }}>
                            {a.apiname}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}