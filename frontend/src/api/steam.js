export const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

export const fetchGames = () =>
    fetch(`${BASE}/games`).then(r => {
        if (!r.ok) throw new Error('Failed to fetch games');
        return r.json();
    });

export const fetchAchievements = (appId) =>
    fetch(`${BASE}/games/${encodeURIComponent(appId)}/achievements`).then(r => {
        if (!r.ok) throw new Error('Failed to fetch achievements');
        return r.json();
    });

export const fetchAchievementsSummary = () =>
    fetch(`${BASE}/games/achievements-summary`).then(r => {
        if (!r.ok) throw new Error('Failed to fetch achievements summary');
        return r.json();
    });
