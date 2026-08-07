import { useAchievements } from '../hooks/useAchievements';
import StatPill from './StatPill';

export default function AchievementPanel({ game }) {
    const { data, loading, error } = useAchievements(game?.appid);

    if (!game) return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '12px', color: '#3a3a48' }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
                <path d="M19.622 10.395 21 9l-4-5-1.603 1.208a7.986 7.986 0 0 0-6.794 0L7 4 3 9l1.378 1.395a8.002 8.002 0 0 0 0 3.21L3 15l4 5 1.603-1.208a7.986 7.986 0 0 0 6.794 0L17 20l4-5-1.378-1.395a8.002 8.002 0 0 0 0-3.21Z" />
            </svg>
            <p style={{ fontSize: '14px' }}>Select a game to view achievements</p>
        </div>
    );

    if (loading) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#5a5a6e', fontSize: '14px' }}>
            Loading achievements...
        </div>
    );

    if (error) return (
        <div style={{ padding: '32px', color: '#f87171', fontSize: '14px' }}>
            Couldn't load achievements.
        </div>
    );

    if (!data?.has_achievements) return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '8px', color: '#5a5a6e' }}>
            <p style={{ fontSize: '14px' }}>{game.name} has no achievements.</p>
        </div>
    );

    const pct = Math.round((data.unlocked / data.total) * 100);
    const locked = data.total - data.unlocked;
    const hours = Math.round(game.playtime_forever / 60 * 10) / 10;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Header */}
            <div style={{
                padding: '28px 32px 24px',
                borderBottom: '1px solid #1e1e2e',
                background: '#0f0f13',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
                    <img
                        src={`https://cdn.cloudflare.steamstatic.com/steam/apps/${game.appid}/header.jpg`}
                        alt={game.name}
                        style={{ width: '120px', height: '45px', objectFit: 'cover', borderRadius: '6px', flexShrink: 0 }}
                        onError={e => { e.target.style.display = 'none'; }}
                    />
                    <div>
                        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600, color: '#e2e2e8' }}>{game.name}</h2>
                        <p style={{ margin: '3px 0 0', fontSize: '13px', color: '#5a5a6e' }}>{hours}h played</p>
                    </div>
                </div>

                {/* Stats row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '20px' }}>
                    <StatPill label="Unlocked" value={data.unlocked} colorClassName="text-accent" />
                    <StatPill label="Locked" value={locked} colorClassName="text-text-muted" />
                    <StatPill label="Completion" value={`${pct}%`} colorClassName={pct === 100 ? 'text-success' : 'text-warning'} />
                </div>

                {/* Progress bar */}
                <div style={{ background: '#1e1e2e', borderRadius: '999px', height: '6px' }}>
                    <div style={{
                        background: pct === 100 ? '#34d399' : 'linear-gradient(90deg, #7c6af7, #a78bfa)',
                        width: `${pct}%`,
                        height: '100%',
                        borderRadius: '999px',
                        transition: 'width 0.5s ease',
                    }} />
                </div>
            </div>

            {/* Achievement list */}
            <div style={{ overflowY: 'auto', flex: 1, padding: '16px 32px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {data.achievements.map(a => (
                        <div key={a.apiname} style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '10px 14px',
                            borderRadius: '8px',
                            background: a.achieved ? '#131a1a' : '#13131a',
                            border: `1px solid ${a.achieved ? '#1a3a2a' : '#1e1e2e'}`,
                            opacity: a.achieved ? 1 : 0.6,
                        }}>
                            <div style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '50%',
                                background: a.achieved ? '#064e3b' : '#1e1e2e',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                            }}>
                                {a.achieved
                                    ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5"><path d="M20 6 9 17l-5-5" /></svg>
                                    : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#3a3a48" strokeWidth="2"><rect width="18" height="11" x="3" y="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                                }
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <span style={{
                                    fontSize: '13px',
                                    color: a.achieved ? '#a8d5b5' : '#4a4a5e',
                                    display: 'block',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                }}>
                                    {a.display_name}
                                </span>
                                {a.description && (
                                    <span style={{
                                        fontSize: '11px',
                                        color: '#3a3a48',
                                        display: 'block',
                                        marginTop: '2px',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                    }}>
                                        {a.description}
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}