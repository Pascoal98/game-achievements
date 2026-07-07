import { useState, useEffect } from 'react';
import { fetchAchievements } from '../api/steam';

export function useAchievements(appId) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!appId) return;
        setLoading(true);
        setData(null);
        fetchAchievements(appId)
            .then(setData)
            .catch(setError)
            .finally(() => setLoading(false));
    }, [appId]);

    return { data, loading, error };
}