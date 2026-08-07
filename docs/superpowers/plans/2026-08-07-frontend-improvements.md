# Frontend Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the game-achievements frontend on Tailwind CSS with sort/filter, a library stats overview, achievement search, and a responsive stacked-mobile layout, backed by a new cached backend endpoint for achievement completion data.

**Architecture:** The FastAPI backend gains one new endpoint (`GET /games/achievements-summary`) plus an in-process TTL cache inside the existing Steam service. The React frontend migrates its inline `style={{}}` objects to Tailwind utility classes driven by a small set of theme tokens, extracts a shared `StatPill` component, adds a `useAchievementsSummary` hook, and reworks `Home` to switch between a single-pane mobile layout and the existing two-pane desktop layout.

**Tech Stack:** FastAPI, Python 3.14 (existing `.venv`), React 19, Vite 8, Tailwind CSS v4 (`@tailwindcss/vite`).

## Global Constraints

- No new test framework is introduced this pass (spec: Testing section). Every task is verified manually — run the dev server(s) and check behavior in a browser / with `curl` — instead of writing automated tests.
- No new frontend routing library; the app stays a single view (spec: section A).
- No database or persistent storage; the only new state is an in-process TTL cache with a 10-minute TTL (spec: section A).
- Styling approach is Tailwind CSS v4, using the CSS-first `@theme` token block, not `tailwind.config.js` (spec: section A, styling approach decision).
- Keep the existing dark purple palette — theme tokens must map to the exact hex values already in use (spec: section A).

---

## Task 1: Backend achievements-summary endpoint with TTL cache

**Files:**
- Modify: `backend/app/services/steam.py`
- Modify: `backend/app/routers/games.py`

**Interfaces:**
- Produces: `steam.get_all_achievements_summary() -> list[dict]`, each dict shaped `{"appid": int, "unlocked": int, "total": int, "has_achievements": bool}`.
- Produces: `GET /games/achievements-summary` → same list, JSON-serialized.
- `get_game_achievements(app_id: int) -> dict` keeps its existing return shape (`{"has_achievements", "achievements", "unlocked", "total"}`); its behavior changes only in that results are now cached for 10 minutes.

- [ ] **Step 1: Add the TTL cache and wrap `get_game_achievements`**

In `backend/app/services/steam.py`, add `import time` to the top imports, then add the cache and wrap the existing function body:

```python
import time
import requests
from app.config import settings

_achievements_cache: dict[int, tuple[float, dict]] = {}
_CACHE_TTL_SECONDS = 600
```

Replace the existing `get_game_achievements` function with:

```python
def get_game_achievements(app_id: int) -> dict:
    cached = _achievements_cache.get(app_id)
    if cached and time.time() - cached[0] < _CACHE_TTL_SECONDS:
        return cached[1]

    url = "http://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v0001/"
    params = {"appid": app_id, "key": settings.steam_api_key, "steamid": settings.steam_id}
    r = requests.get(url, params=params)

    if r.status_code == 400:
        result = {"has_achievements": False, "achievements": [], "unlocked": 0, "total": 0}
        _achievements_cache[app_id] = (time.time(), result)
        return result
    r.raise_for_status()

    achievements = r.json().get("playerstats", {}).get("achievements", [])
    schema = get_game_schema(app_id)

    enriched = []
    for a in achievements:
        name = a.get("apiname", "")
        meta = schema.get(name, {})
        enriched.append({
            "apiname": name,
            "achieved": a.get("achieved", 0),
            "display_name": meta.get("display_name") or name,
            "description": meta.get("description", ""),
        })

    result = {
        "has_achievements": True,
        "achievements": enriched,
        "unlocked": sum(1 for a in achievements if a.get("achieved") == 1),
        "total": len(achievements),
    }
    _achievements_cache[app_id] = (time.time(), result)
    return result
```

- [ ] **Step 2: Add `get_all_achievements_summary`**

Append to `backend/app/services/steam.py`:

```python
def get_all_achievements_summary() -> list[dict]:
    games = get_owned_games()
    summary = []
    for game in games:
        app_id = game["appid"]
        data = get_game_achievements(app_id)
        summary.append({
            "appid": app_id,
            "unlocked": data["unlocked"],
            "total": data["total"],
            "has_achievements": data["has_achievements"],
        })
    return summary
```

- [ ] **Step 3: Add the router endpoint**

In `backend/app/routers/games.py`, append:

```python
@router.get("/achievements-summary")
def get_achievements_summary():
    try:
        return steam.get_all_achievements_summary()
    except Exception:
        raise HTTPException(status_code=502, detail="Steam API error")
```

- [ ] **Step 4: Manually verify**

Run: `cd backend && ../.venv/bin/python run.py`

In another terminal:
```bash
curl -s http://localhost:8000/games/achievements-summary | python3 -m json.tool | head -20
```
Expected: a JSON array where each item has `appid`, `unlocked`, `total`, `has_achievements` keys, matching the app IDs seen from `curl -s http://localhost:8000/games`.

Run the same `curl` command a second time immediately after — the response should return noticeably faster (cache hit) and be identical.

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/steam.py backend/app/routers/games.py
git commit -m "feat(backend): add cached achievements-summary endpoint"
```

---

## Task 2: Add Tailwind CSS to the frontend

**Files:**
- Modify: `frontend/package.json` (via `npm install`)
- Modify: `frontend/vite.config.js`
- Modify: `frontend/src/index.css`
- Delete: `frontend/src/App.css`

**Interfaces:**
- Produces: Tailwind utility classes available in all `.jsx` files, plus theme color tokens `accent`, `accent-light`, `bg-app`, `bg-sidebar`, `bg-surface`, `bg-elevated`, `border` (DEFAULT), `border-faint`, `text` (DEFAULT), `text-bright`, `text-muted`, `text-faint`, `success`, `success-bg`, `success-border`, `warning`, `error` — usable as `bg-*`, `text-*`, `border-*` classes in later tasks.

- [ ] **Step 1: Install Tailwind**

```bash
cd frontend && npm install -D tailwindcss @tailwindcss/vite
```

- [ ] **Step 2: Wire the Vite plugin**

Replace `frontend/vite.config.js` with:

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
})
```

- [ ] **Step 3: Define theme tokens and replace `index.css`**

Replace `frontend/src/index.css` with:

```css
@import "tailwindcss";

@theme {
  --color-accent: #7c6af7;
  --color-accent-light: #c4b9ff;
  --color-bg-app: #0f0f13;
  --color-bg-sidebar: #0c0c11;
  --color-bg-surface: #16161f;
  --color-bg-elevated: #1e1e2e;
  --color-border: #2a2a35;
  --color-border-faint: #1e1e2e;
  --color-text: #d0d0da;
  --color-text-bright: #e2e2e8;
  --color-text-muted: #5a5a6e;
  --color-text-faint: #3a3a48;
  --color-success: #34d399;
  --color-success-bg: #064e3b;
  --color-success-border: #1a3a2a;
  --color-warning: #f59e0b;
  --color-error: #f87171;
}

body {
  background: var(--color-bg-app);
  color: var(--color-text-bright);
  font-family: system-ui, -apple-system, sans-serif;
}

::-webkit-scrollbar {
  width: 6px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: var(--color-border);
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: #3a3a48;
}
```

- [ ] **Step 4: Delete unused boilerplate**

```bash
rm frontend/src/App.css
```

Confirm nothing imports it: `grep -rn "App.css" frontend/src` should print nothing.

- [ ] **Step 5: Manually verify**

Run: `cd frontend && npm run dev`

Open the app in a browser. Expected: it looks the same as before (dark background `#0f0f13`, light text) since no component styles changed yet — this step only confirms Tailwind compiles without errors and the base `body` styling still applies.

Run: `cd frontend && npm run build` — expected: build succeeds with no errors.

- [ ] **Step 6: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/vite.config.js frontend/src/index.css
git rm frontend/src/App.css
git commit -m "build(frontend): add Tailwind CSS and theme tokens"
```

---

## Task 3: Extract `StatPill` into its own component

**Files:**
- Create: `frontend/src/components/StatPill.jsx`
- Modify: `frontend/src/components/AchievementPanel.jsx:1-16` (remove the inline `StatPill` function and its inline styles; import from the new file instead — full rewrite happens in Task 8, so for this task only remove the local definition and add the import)

**Interfaces:**
- Produces: `StatPill({ label: string, value: string | number, colorClassName?: string })`, default export from `frontend/src/components/StatPill.jsx`. `colorClassName` is a Tailwind text-color class (e.g. `"text-accent"`); defaults to `"text-text-bright"`.

- [ ] **Step 1: Create the component**

```jsx
export default function StatPill({ label, value, colorClassName = 'text-text-bright' }) {
    return (
        <div className="rounded-lg border border-border bg-bg-surface px-5 py-3 text-center">
            <p className={`m-0 text-[22px] font-semibold ${colorClassName}`}>{value}</p>
            <p className="mt-0.5 mb-0 text-[11px] uppercase tracking-wider text-text-muted">{label}</p>
        </div>
    );
}
```

Save as `frontend/src/components/StatPill.jsx`.

- [ ] **Step 2: Remove the inline definition from `AchievementPanel.jsx`**

In `frontend/src/components/AchievementPanel.jsx`, delete the local `StatPill` function (lines 1-16 in the current file) and add an import instead:

```jsx
import StatPill from './StatPill';
```

Leave the rest of `AchievementPanel.jsx` untouched for now — its full Tailwind conversion happens in Task 8. The three `<StatPill .../>` call sites currently pass a `color` prop with a hex string; they'll keep working visually as `color` is simply ignored by the new `StatPill` (no `color` prop) until Task 8 updates the call sites to `colorClassName`. To avoid a broken intermediate state, also do a find-and-replace in this file right now: change every `color="#7c6af7"` → `colorClassName="text-accent"`, `color="#5a5a6e"` → `colorClassName="text-text-muted"`, and `color={pct === 100 ? '#34d399' : '#f59e0b'}` → `colorClassName={pct === 100 ? 'text-success' : 'text-warning'}`.

- [ ] **Step 3: Manually verify**

Run: `cd frontend && npm run dev`, select a game with achievements in the browser. Expected: the three stat pills (Unlocked / Locked / Completion) still render with the same colors as before (purple, gray, green-or-amber), now using the shared component.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/StatPill.jsx frontend/src/components/AchievementPanel.jsx
git commit -m "refactor(frontend): extract StatPill into its own component"
```

---

## Task 4: Convert `GameCard` to Tailwind

**Files:**
- Modify: `frontend/src/components/GameCard.jsx` (full rewrite)

**Interfaces:**
- Unchanged: `GameCard({ game, selected, onClick })`, default export.

- [ ] **Step 1: Rewrite the component**

Replace the full contents of `frontend/src/components/GameCard.jsx` with:

```jsx
const IMG_BASE = 'https://media.steampowered.com/steamcommunity/public/images/apps';

export default function GameCard({ game, selected, onClick }) {
    const hours = Math.round(game.playtime_forever / 60 * 10) / 10;

    return (
        <div
            onClick={onClick}
            className={`flex cursor-pointer items-center gap-3 border-l-[3px] px-4 py-2.5 transition-colors ${
                selected
                    ? 'border-accent bg-bg-elevated'
                    : 'border-transparent hover:bg-bg-surface'
            }`}
        >
            <img
                src={`${IMG_BASE}/${game.appid}/${game.img_icon_url}.jpg`}
                alt={game.name}
                width={36}
                height={36}
                className="flex-shrink-0 rounded-md object-cover"
                onError={e => { e.target.style.display = 'none'; }}
            />
            <div className="min-w-0 flex-1">
                <p className={`m-0 truncate text-[13px] font-medium ${selected ? 'text-accent-light' : 'text-text'}`}>
                    {game.name}
                </p>
                <p className="m-0 mt-0.5 text-[11px] text-text-muted">
                    {hours}h played
                </p>
            </div>
        </div>
    );
}
```

- [ ] **Step 2: Manually verify**

Run: `cd frontend && npm run dev`. Expected in the browser: game rows look the same as before (icon, name, hours), selected row has a purple left border and highlighted background, hover on unselected rows lightens the background.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/GameCard.jsx
git commit -m "style(frontend): convert GameCard to Tailwind"
```

---

## Task 5: Achievements-summary API call and hook

**Files:**
- Modify: `frontend/src/api/steam.js`
- Create: `frontend/src/hooks/useAchievementsSummary.js`

**Interfaces:**
- Produces: `fetchAchievementsSummary(): Promise<Array<{appid, unlocked, total, has_achievements}>>` from `frontend/src/api/steam.js`.
- Produces: `useAchievementsSummary()` hook returning `{ summary: Record<number, {appid, unlocked, total, has_achievements}>, loading: boolean, error: Error | null }` from `frontend/src/hooks/useAchievementsSummary.js`. `summary` is keyed by `appid` for O(1) lookup from `GameList` and `LibraryOverview`.

- [ ] **Step 1: Add the API call**

Append to `frontend/src/api/steam.js`:

```js
export const fetchAchievementsSummary = () =>
    fetch(`${BASE}/games/achievements-summary`).then(r => {
        if (!r.ok) throw new Error('Failed to fetch achievements summary');
        return r.json();
    });
```

- [ ] **Step 2: Add the hook**

Create `frontend/src/hooks/useAchievementsSummary.js`:

```js
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
```

- [ ] **Step 3: Manually verify**

With the backend running (Task 1), temporarily add `console.log(useAchievementsSummary())` inside `Home` (don't commit this), run `npm run dev`, and confirm in the browser dev console that `summary` populates as an object keyed by numeric app IDs after a moment, then remove the temporary log.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/api/steam.js frontend/src/hooks/useAchievementsSummary.js
git commit -m "feat(frontend): add achievements-summary API call and hook"
```

---

## Task 6: Convert `GameList` to Tailwind, add sort/filter, add loading skeleton

**Files:**
- Modify: `frontend/src/components/GameList.jsx` (full rewrite)

**Interfaces:**
- Consumes: `GameCard({ game, selected, onClick })` from Task 4; `summary` shape `Record<appid, {unlocked, total, has_achievements}>` from Task 5.
- Produces: `GameList({ games, selectedId, onSelect, loading, error, summary, summaryLoading })`, default export. `summary` and `summaryLoading` are new required props supplied by `Home` (Task 9).

- [ ] **Step 1: Rewrite the component**

Replace the full contents of `frontend/src/components/GameList.jsx` with:

```jsx
import { useState, useMemo } from 'react';
import GameCard from './GameCard';

function GameCardSkeleton() {
    return (
        <div className="flex items-center gap-3 px-4 py-2.5">
            <div className="h-9 w-9 flex-shrink-0 animate-pulse rounded-md bg-bg-surface" />
            <div className="flex-1 space-y-2">
                <div className="h-3 w-3/4 animate-pulse rounded bg-bg-surface" />
                <div className="h-2.5 w-1/3 animate-pulse rounded bg-bg-surface" />
            </div>
        </div>
    );
}

export default function GameList({ games, selectedId, onSelect, loading, error, summary, summaryLoading }) {
    const [search, setSearch] = useState('');
    const [sortBy, setSortBy] = useState('playtime');
    const [onlyWithAchievements, setOnlyWithAchievements] = useState(false);

    const filtered = useMemo(() => {
        let list = games.filter(g =>
            g.name.toLowerCase().includes(search.toLowerCase())
        );

        if (onlyWithAchievements) {
            list = list.filter(g => summary[g.appid]?.has_achievements);
        }

        list = [...list].sort((a, b) => {
            if (sortBy === 'name') return a.name.localeCompare(b.name);
            if (sortBy === 'completion') {
                const aSummary = summary[a.appid];
                const bSummary = summary[b.appid];
                const aPct = aSummary?.total ? aSummary.unlocked / aSummary.total : -1;
                const bPct = bSummary?.total ? bSummary.unlocked / bSummary.total : -1;
                return bPct - aPct;
            }
            return b.playtime_forever - a.playtime_forever;
        });

        return list;
    }, [games, search, sortBy, onlyWithAchievements, summary]);

    if (loading) return (
        <div className="flex flex-col gap-1 pt-2">
            {Array.from({ length: 8 }).map((_, i) => <GameCardSkeleton key={i} />)}
        </div>
    );
    if (error) return (
        <div className="px-4 py-6 text-[13px] text-error">
            Couldn't load games.
        </div>
    );

    return (
        <div className="flex h-full flex-col">
            <div className="flex flex-col gap-2 px-4 py-3">
                <input
                    type="text"
                    placeholder="Search games..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full rounded-md border border-border bg-bg-surface px-2.5 py-1.5 text-xs text-text outline-none focus:border-accent"
                />
                <select
                    value={sortBy}
                    onChange={e => setSortBy(e.target.value)}
                    className="w-full rounded-md border border-border bg-bg-surface px-2 py-1 text-[11px] text-text outline-none"
                >
                    <option value="playtime">Sort: Playtime</option>
                    <option value="name">Sort: Name</option>
                    <option value="completion" disabled={summaryLoading}>Sort: Completion %</option>
                </select>
                <label className="flex items-center gap-1.5 text-[11px] text-text-muted">
                    <input
                        type="checkbox"
                        checked={onlyWithAchievements}
                        onChange={e => setOnlyWithAchievements(e.target.checked)}
                    />
                    Only games with achievements
                </label>
            </div>
            <div className="flex-1 overflow-y-auto">
                {filtered.map(game => (
                    <GameCard
                        key={game.appid}
                        game={game}
                        selected={game.appid === selectedId}
                        onClick={() => onSelect(game)}
                    />
                ))}
                {filtered.length === 0 && (
                    <p className="px-4 py-4 text-[13px] text-text-muted">
                        No games found.
                    </p>
                )}
            </div>
        </div>
    );
}
```

- [ ] **Step 2: Manually verify**

Run `cd frontend && npm run dev` with the backend running. In the browser: confirm the loading state briefly shows pulsing skeleton rows, then the real list appears. Type in the search box and confirm filtering still works. Switch the sort dropdown between Playtime/Name/Completion % and confirm the order changes (Completion % should be disabled/greyed until the summary finishes loading, then re-order once enabled). Toggle "Only games with achievements" and confirm games without achievements disappear.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/GameList.jsx
git commit -m "feat(frontend): add sort/filter and loading skeleton to GameList"
```

---

## Task 7: `LibraryOverview` component

**Files:**
- Create: `frontend/src/components/LibraryOverview.jsx`

**Interfaces:**
- Consumes: `StatPill({ label, value, colorClassName })` from Task 3; `summary` shape from Task 5.
- Produces: `LibraryOverview({ games, summary, summaryLoading })`, default export. Rendered by `Home` (Task 9) in the main panel when no game is selected.

- [ ] **Step 1: Create the component**

```jsx
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
```

- [ ] **Step 2: Manually verify**

This component is wired into `Home` in Task 9 — defer visual verification to Task 9's step. For now, confirm the file has no syntax errors: `cd frontend && npx eslint src/components/LibraryOverview.jsx`. Expected: no errors (an "unused" warning is fine since nothing imports it yet).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/LibraryOverview.jsx
git commit -m "feat(frontend): add LibraryOverview component"
```

---

## Task 8: Convert `AchievementPanel` to Tailwind, add search, skeleton, and back button

**Files:**
- Modify: `frontend/src/components/AchievementPanel.jsx` (full rewrite, replacing the Task 3 intermediate version)

**Interfaces:**
- Consumes: `StatPill({ label, value, colorClassName })` from Task 3.
- Produces: `AchievementPanel({ game, onBack })`, default export. `game` is always a selected game object (the "no game selected" placeholder is removed — that responsibility now belongs to `LibraryOverview`, rendered by `Home` instead of `AchievementPanel` when nothing is selected). `onBack` is a required callback, rendered as a `md:hidden` back button.

- [ ] **Step 1: Rewrite the component**

Replace the full contents of `frontend/src/components/AchievementPanel.jsx` with:

```jsx
import { useState, useMemo } from 'react';
import { useAchievements } from '../hooks/useAchievements';
import StatPill from './StatPill';

function AchievementSkeleton() {
    return (
        <div className="flex flex-col gap-1.5">
            {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 rounded-lg border border-border-faint px-3.5 py-2.5">
                    <div className="h-7 w-7 flex-shrink-0 animate-pulse rounded-full bg-bg-surface" />
                    <div className="flex-1 space-y-2">
                        <div className="h-3 w-1/2 animate-pulse rounded bg-bg-surface" />
                        <div className="h-2.5 w-1/4 animate-pulse rounded bg-bg-surface" />
                    </div>
                </div>
            ))}
        </div>
    );
}

export default function AchievementPanel({ game, onBack }) {
    const { data, loading, error } = useAchievements(game?.appid);
    const [search, setSearch] = useState('');

    const filteredAchievements = useMemo(() => {
        if (!data?.achievements) return [];
        const q = search.toLowerCase();
        return data.achievements.filter(a =>
            a.display_name.toLowerCase().includes(q) ||
            a.description.toLowerCase().includes(q)
        );
    }, [data, search]);

    if (loading) return (
        <div className="h-full p-8">
            <AchievementSkeleton />
        </div>
    );

    if (error) return (
        <div className="p-8 text-sm text-error">
            Couldn't load achievements.
        </div>
    );

    if (!data?.has_achievements) return (
        <div className="flex h-full flex-col items-center justify-center gap-2 text-text-muted">
            <button onClick={onBack} className="absolute left-4 top-4 text-xs text-accent md:hidden">
                ← Back to library
            </button>
            <p className="text-sm">{game.name} has no achievements.</p>
        </div>
    );

    const pct = Math.round((data.unlocked / data.total) * 100);
    const locked = data.total - data.unlocked;
    const hours = Math.round(game.playtime_forever / 60 * 10) / 10;

    return (
        <div className="flex h-full flex-col transition-opacity duration-300">
            <div className="border-b border-border-faint bg-bg-app px-8 pb-6 pt-7">
                <button onClick={onBack} className="mb-3 block text-xs text-accent md:hidden">
                    ← Back to library
                </button>
                <div className="mb-5 flex items-center gap-4">
                    <img
                        src={`https://cdn.cloudflare.steamstatic.com/steam/apps/${game.appid}/header.jpg`}
                        alt={game.name}
                        className="h-[45px] w-[120px] flex-shrink-0 rounded-md object-cover"
                        onError={e => { e.target.style.display = 'none'; }}
                    />
                    <div>
                        <h2 className="m-0 text-xl font-semibold text-text-bright">{game.name}</h2>
                        <p className="m-0 mt-0.5 text-[13px] text-text-muted">{hours}h played</p>
                    </div>
                </div>

                <div className="mb-5 grid grid-cols-3 gap-2.5">
                    <StatPill label="Unlocked" value={data.unlocked} colorClassName="text-accent" />
                    <StatPill label="Locked" value={locked} colorClassName="text-text-muted" />
                    <StatPill
                        label="Completion"
                        value={`${pct}%`}
                        colorClassName={pct === 100 ? 'text-success' : 'text-warning'}
                    />
                </div>

                <div className="h-1.5 rounded-full bg-bg-elevated">
                    <div
                        className={`h-full rounded-full transition-all duration-500 ${
                            pct === 100 ? 'bg-success' : 'bg-gradient-to-r from-accent to-accent-light'
                        }`}
                        style={{ width: `${pct}%` }}
                    />
                </div>

                <input
                    type="text"
                    placeholder="Search achievements..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="mt-4 w-full rounded-md border border-border bg-bg-surface px-2.5 py-1.5 text-xs text-text outline-none focus:border-accent"
                />
            </div>

            <div className="flex-1 overflow-y-auto px-8 py-4">
                <div className="flex flex-col gap-1.5">
                    {filteredAchievements.map(a => (
                        <div
                            key={a.apiname}
                            className={`flex items-center gap-3 rounded-lg border px-3.5 py-2.5 ${
                                a.achieved
                                    ? 'border-success-border bg-[#131a1a]'
                                    : 'border-border-faint bg-[#13131a] opacity-60'
                            }`}
                        >
                            <div className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full ${
                                a.achieved ? 'bg-success-bg' : 'bg-bg-elevated'
                            }`}>
                                {a.achieved
                                    ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5"><path d="M20 6 9 17l-5-5" /></svg>
                                    : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#3a3a48" strokeWidth="2"><rect width="18" height="11" x="3" y="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                                }
                            </div>
                            <div className="min-w-0 flex-1">
                                <span className={`block truncate text-[13px] ${a.achieved ? 'text-[#a8d5b5]' : 'text-text-faint'}`}>
                                    {a.display_name}
                                </span>
                                {a.description && (
                                    <span className="mt-0.5 block truncate text-[11px] text-text-faint">
                                        {a.description}
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                    {filteredAchievements.length === 0 && (
                        <p className="px-1 py-4 text-[13px] text-text-muted">No achievements found.</p>
                    )}
                </div>
            </div>
        </div>
    );
}
```

- [ ] **Step 2: Manually verify**

This component's `onBack` prop is exercised once `Home` is wired in Task 9 — defer the back-button check there. For now confirm no syntax errors: `cd frontend && npx eslint src/components/AchievementPanel.jsx`.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/AchievementPanel.jsx
git commit -m "style(frontend): convert AchievementPanel to Tailwind, add search and back button"
```

---

## Task 9: Wire `Home` — responsive layout, stats overview, achievements summary

**Files:**
- Modify: `frontend/src/pages/Home.jsx` (full rewrite)

**Interfaces:**
- Consumes: `GameList({ games, selectedId, onSelect, loading, error, summary, summaryLoading })` (Task 6), `AchievementPanel({ game, onBack })` (Task 8), `LibraryOverview({ games, summary, summaryLoading })` (Task 7), `useAchievementsSummary()` (Task 5).

- [ ] **Step 1: Rewrite the component**

Replace the full contents of `frontend/src/pages/Home.jsx` with:

```jsx
import { useState } from 'react';
import GameList from '../components/GameList';
import AchievementPanel from '../components/AchievementPanel';
import LibraryOverview from '../components/LibraryOverview';
import { useGames } from '../hooks/useGames';
import { useAchievementsSummary } from '../hooks/useAchievementsSummary';

export default function Home() {
    const { games, loading, error } = useGames();
    const { summary, loading: summaryLoading } = useAchievementsSummary();
    const [selectedGame, setSelectedGame] = useState(null);

    return (
        <div className="flex h-screen bg-bg-app">
            <aside
                className={`w-full flex-shrink-0 flex-col border-r border-border-faint bg-bg-sidebar md:flex md:w-[260px] ${
                    selectedGame ? 'hidden' : 'flex'
                }`}
            >
                <div className="px-4 pb-3 pt-5">
                    <h1 className="m-0 text-sm font-semibold uppercase tracking-wider text-accent">
                        Your library
                    </h1>
                    {!loading && (
                        <p className="m-0 mt-0.5 text-[11px] text-text-faint">
                            {games.length} games
                        </p>
                    )}
                </div>
                <div className="flex flex-1 flex-col overflow-hidden">
                    <GameList
                        games={games}
                        selectedId={selectedGame?.appid}
                        onSelect={setSelectedGame}
                        loading={loading}
                        error={error}
                        summary={summary}
                        summaryLoading={summaryLoading}
                    />
                </div>
            </aside>

            <main
                className={`relative flex-1 overflow-hidden md:block ${selectedGame ? 'block' : 'hidden'}`}
            >
                {selectedGame ? (
                    <AchievementPanel game={selectedGame} onBack={() => setSelectedGame(null)} />
                ) : (
                    <LibraryOverview games={games} summary={summary} summaryLoading={summaryLoading} />
                )}
            </main>
        </div>
    );
}
```

- [ ] **Step 2: Manually verify — desktop layout**

Run `cd backend && ../.venv/bin/python run.py` in one terminal and `cd frontend && npm run dev` in another. Open the app at a desktop browser width (≥768px). Expected: sidebar and main panel both visible side by side, same as before. With no game selected, the main panel shows the new `LibraryOverview` (game count, hours, completion stat pills) instead of the old placeholder icon. Selecting a game shows `AchievementPanel` as before; no back button visible.

- [ ] **Step 3: Manually verify — mobile layout**

Using the browser's device toolbar (or resizing the window below 768px width): with no game selected, only the game list shows, full width. Tap/click a game — the list is replaced by the full-width achievement panel with a "← Back to library" button at the top. Clicking it returns to the full-width game list. Resize back above 768px — both panes should reappear side by side and the back button should disappear.

- [ ] **Step 4: Run lint**

```bash
cd frontend && npm run lint
```
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/Home.jsx
git commit -m "feat(frontend): responsive layout with library stats overview"
```

---

## Post-implementation check

- [ ] Re-read `docs/superpowers/specs/2026-08-07-frontend-improvements-design.md` sections A–D and confirm each is covered:
  - A (architecture/tooling): Tasks 2, 1
  - B (backend API): Task 1
  - C (features — sort/filter, stats overview, achievement search): Tasks 6, 7, 8
  - D (responsiveness, polish): Tasks 8, 9
- [ ] Full manual smoke test: fresh `npm run dev` + backend run, exercise every feature listed in the spec once end-to-end.
