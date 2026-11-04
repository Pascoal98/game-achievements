export default function BentoTile({ title, className = '', children }) {
    return (
        <section className={`flex flex-col rounded-tile border border-border-faint bg-bg-surface p-5 ${className}`}>
            {title && <h2 className="m-0 mb-4 text-[13px] font-medium text-text-muted">{title}</h2>}
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
