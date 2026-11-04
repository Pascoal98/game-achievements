import { useState, useEffect } from 'react';
import { fetchNowPlaying } from '../api/steam';

export function useNowPlaying() {
    const [nowPlaying, setNowPlaying] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchNowPlaying()
            .then(setNowPlaying)
            .catch(setError)
            .finally(() => setLoading(false));
    }, []);

    return { nowPlaying, loading, error };
}
