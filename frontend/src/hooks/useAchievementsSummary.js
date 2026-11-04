import { useState, useEffect } from 'react';
import { fetchAchievementsSummary } from '../api/steam';

export function useAchievementsSummary() {
    const [summary, setSummary] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchAchievementsSummary()
            .then(list => {
                const byAppId = {};
                for (const item of list) byAppId[item.appid] = item;
                setSummary(byAppId);
            })
            .catch(setError)
            .finally(() => setLoading(false));
    }, []);

    return { summary, loading, error };
}
