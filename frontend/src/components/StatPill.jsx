export default function StatPill({ label, value, colorClassName = 'text-text-bright' }) {
    return (
        <div className="rounded-lg border border-border bg-bg-surface px-5 py-3 text-center">
            <p className={`m-0 text-[22px] font-semibold ${colorClassName}`}>{value}</p>
            <p className="mt-0.5 mb-0 text-[11px] uppercase tracking-wider text-text-muted">{label}</p>
        </div>
    );
}
