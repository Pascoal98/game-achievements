const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

const UNITS = [
    ['year', 365 * 86400],
    ['month', 30 * 86400],
    ['week', 7 * 86400],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
];

export function formatHours(minutes) {
    const hours = minutes / 60;
    if (hours < 10) return `${Number(hours.toFixed(1))}h`;
    return `${Math.round(hours).toLocaleString('en-US')}h`;
}

// Steam uses 0 for "never launched", so that is a state, not the epoch.
export function formatRelativeTime(unixSeconds, nowMs) {
    if (!unixSeconds) return 'Never played';
    const elapsed = nowMs / 1000 - unixSeconds;
    for (const [unit, seconds] of UNITS) {
        if (elapsed >= seconds) return rtf.format(-Math.floor(elapsed / seconds), unit);
    }
    return 'just now';
}

export function formatDate(unixSeconds) {
    return new Date(unixSeconds * 1000).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}
