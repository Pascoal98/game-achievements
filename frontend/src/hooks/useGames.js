import { useState, useEffect } from 'react';
import { fetchGames } from '../api/steam';

export function useGames() {
    const [games, setGames] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchGames()
            .then(setGames)
            .catch(setError)
            .finally(() => setLoading(false));
    }, []);

    return { games, loading, error };
}