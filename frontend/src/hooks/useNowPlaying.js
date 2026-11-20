import { useState, useEffect } from 'react';
import { fetchNowPlaying } from '../api/steam';

const POLL_MS = 60_000;

// The Steam appid you're in right now, or null. Live status is a bonus on top of
// "last played", so a failed check reads as not live instead of keeping a stale game.
export function useNowPlaying() {
    const [appid, setAppid] = useState(null);

    useEffect(() => {
        const check = () => fetchNowPlaying()
            .then(r => setAppid(r.appid ?? null))
            .catch(() => setAppid(null));
        check();
        const id = setInterval(() => { if (!document.hidden) check(); }, POLL_MS);
        return () => clearInterval(id);
    }, []);

    return appid;
}
