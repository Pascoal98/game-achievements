export default function BentoTile({ title, className = '', children }) {
    return (
        <section className={`flex flex-col ${className}`}>
            {title && <h2 className="m-0 mb-3 font-display text-[22px] font-semibold text-text-bright">{title}</h2>}
            {children}
        </section>
    );
}

export function TileSkeleton({ lines = 2 }) {
    return (
        <div className="space-y-3">
            <div className="h-8 w-1/2 animate-pulse rounded bg-bg-elevated" />
            {Array.from({ length: lines }).map((_, i) => (
                <div key={i} className="h-3 w-3/4 animate-pulse rounded bg-bg-elevated" />
            ))}
        </div>
    );
}

export function TileUnavailable({ what }) {
    return <p className="m-0 text-sm text-text-muted">Unavailable: {what} couldn't be loaded from Steam. Reload to try again.</p>;
}
