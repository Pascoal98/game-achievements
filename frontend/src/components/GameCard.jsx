const IMG_BASE = 'https://media.steampowered.com/steamcommunity/public/images/apps';

export default function GameCard({ game, selected, onClick }) {
    const hours = Math.round(game.playtime_forever / 60 * 10) / 10;

    return (
        <div
            onClick={onClick}
            className={`flex cursor-pointer items-center gap-3 border-l-[3px] px-4 py-2.5 transition-colors ${
                selected
                    ? 'border-accent bg-bg-elevated'
                    : 'border-transparent hover:bg-bg-surface'
            }`}
        >
            <img
                src={`${IMG_BASE}/${game.appid}/${game.img_icon_url}.jpg`}
                alt={game.name}
                width={36}
                height={36}
                className="flex-shrink-0 rounded-md object-cover"
                onError={e => { e.target.style.display = 'none'; }}
            />
            <div className="min-w-0 flex-1">
                <p className={`m-0 truncate text-[13px] font-medium ${selected ? 'text-accent-light' : 'text-text'}`}>
                    {game.name}
                </p>
                <p className="m-0 mt-0.5 text-[11px] text-text-muted">
                    {hours}h played
                </p>
            </div>
        </div>
    );
}