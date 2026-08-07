import { useState, useEffect } from 'react';
import { fetchAchievements } from '../api/steam';

export function useAchievements(appId) {
    const [result, setResult] = useState({ appId: null, data: null, error: null });

    useEffect(() => {
        if (!appId) return;
        let cancelled = false;

        fetchAchievements(appId)
            .then(data => { if (!cancelled) setResult({ appId, data, error: null }); })
            .catch(error => { if (!cancelled) setResult({ appId, data: null, error }); });

        return () => { cancelled = true; };
    }, [appId]);

    const loading = Boolean(appId) && result.appId !== appId;
    const current = result.appId === appId ? result : { data: null, error: null };

    return { data: current.data, loading, error: current.error };
}
