const IMG_BASE = 'https://media.steampowered.com/steamcommunity/public/images/apps';

export default function GameCard({ game, selected, onClick }) {
    const hours = Math.round(game.playtime_forever / 60 * 10) / 10;

    return (
        <div onClick={onClick} style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '10px 16px',
            cursor: 'pointer',
            background: selected ? '#1e1e2e' : 'transparent',
            borderLeft: selected ? '3px solid #7c6af7' : '3px solid transparent',
            transition: 'all 0.15s',
        }}
            onMouseEnter={e => { if (!selected) e.currentTarget.style.background = '#16161f'; }}
            onMouseLeave={e => { if (!selected) e.currentTarget.style.background = 'transparent'; }}
        >
            <img
                src={`${IMG_BASE}/${game.appid}/${game.img_icon_url}.jpg`}
                alt={game.name}
                width={36}
                height={36}
                style={{ borderRadius: '6px', flexShrink: 0, objectFit: 'cover' }}
                onError={e => { e.target.style.display = 'none'; }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{
                    margin: 0,
                    fontWeight: 500,
                    fontSize: '13px',
                    color: selected ? '#c4b9ff' : '#d0d0da',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                }}>
                    {game.name}
                </p>
                <p style={{ margin: 0, fontSize: '11px', color: '#5a5a6e', marginTop: '2px' }}>
                    {hours}h played
                </p>
            </div>
        </div>
    );
}