const IMG_BASE = 'https://media.steampowered.com/steamcommunity/public/images/apps';

export default function GameCard({ game, selected, onClick }) {
    const hours = Math.round(game.playtime_forever / 60 * 10) / 10;

    return (
        <div onClick={onClick} style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 16px',
            cursor: 'pointer',
            borderBottom: '1px solid #e5e7eb',
            backgroundColor: selected ? '#f0f9ff' : 'white',
            transition: 'background 0.15s',
        }}>
            <img
                src={`${IMG_BASE}/${game.appid}/${game.img_icon_url}.jpg`}
                alt={game.name}
                width={40}
                height={40}
                style={{ borderRadius: '6px', flexShrink: 0 }}
                onError={e => { e.target.style.display = 'none'; }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontWeight: 500, fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {game.name}
                </p>
                <p style={{ margin: 0, fontSize: '12px', color: '#6b7280' }}>
                    {hours}h played
                </p>
            </div>
        </div>
    );
}