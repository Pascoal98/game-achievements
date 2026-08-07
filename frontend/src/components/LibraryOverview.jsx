import StatPill from './StatPill';

export default function LibraryOverview({ games, summary, summaryLoading }) {
    const totalGames = games.length;
    const totalHours = Math.round(
        games.reduce((sum, g) => sum + g.playtime_forever, 0) / 60
    );

    const totals = Object.values(summary).reduce(
        (acc, s) => {
            acc.unlocked += s.unlocked;
            acc.total += s.total;
            return acc;
        },
        { unlocked: 0, total: 0 }
    );
    const completionPct = totals.total > 0 ? Math.round((totals.unlocked / totals.total) * 100) : 0;

    return (
        <div className="flex h-full flex-col items-center justify-center gap-6">
            <p className="m-0 text-sm text-text-muted">Select a game to view achievements</p>
            <div className="grid grid-cols-3 gap-3">
                <StatPill label="Games" value={totalGames} colorClassName="text-accent" />
                <StatPill label="Hours played" value={totalHours} colorClassName="text-text-bright" />
                <StatPill
                    label="Completion"
                    value={summaryLoading ? '…' : `${completionPct}%`}
                    colorClassName={completionPct === 100 ? 'text-success' : 'text-warning'}
                />
            </div>
        </div>
    );
}
