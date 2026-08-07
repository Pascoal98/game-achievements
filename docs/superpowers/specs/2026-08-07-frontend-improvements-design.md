# Frontend improvements design

Date: 2026-08-07
Status: approved, pending implementation plan

## Context

The project is a Steam achievement/playtime tracker: a FastAPI backend
(`backend/app`) that proxies the Steam Web API, and a React + Vite frontend
(`frontend/src`) with a two-pane layout — a game list sidebar and an
achievement detail panel. There is no database; the backend calls Steam live
on every request. The frontend is functionally complete for Steam but styled
entirely with inline `style={{...}}` objects, has no sort/filter/search, and
assumes a desktop-width viewport.

This is the first of three planned initiatives for this project (the other
two — Switch playtime and Epic Games playtime — depend on unofficial/private
APIs and are deliberately out of scope here; they'll get their own specs).

Goal for this pass: improve the frontend across four axes the user cares
about — new features, visual polish, code architecture, and responsiveness —
without touching the Switch/Epic data-source question.

## Non-goals

- No Switch or Epic Games integration.
- No persistent database or server-side storage beyond an in-memory TTL
  cache (see below).
- No new frontend routing library — the app remains a single view.
- No test framework introduction — verification for this pass is manual
  (see Testing section).

## A. Architecture & tooling

- **Styling migration**: Add Tailwind CSS to the Vite frontend
  (`tailwindcss` + `@tailwindcss/vite` plugin). Remove the unused Vite
  boilerplate in `frontend/src/App.css`. Rewrite the inline `style={{...}}`
  objects in `GameCard`, `GameList`, `AchievementPanel`, and `Home` as
  Tailwind utility classes.
- Define the current purple/dark palette as Tailwind theme tokens (e.g.
  `accent`, `bg-surface`, `bg-elevated`, `border-subtle`, `text-muted`)
  instead of the repeated hex literals currently scattered through the
  components (`#7c6af7`, `#0f0f13`, `#1e1e2e`, etc.).
- **Backend caching**: add a small in-process TTL cache (plain dict keyed by
  `app_id`, storing `(timestamp, data)`, no new dependency) in
  `backend/app/services/steam.py`. TTL: 10 minutes. Used by the new
  achievements-summary endpoint below to avoid re-hitting Steam's API for
  every game on every page load.
- No routing library is introduced. The "stacked mobile layout" described in
  section D is a CSS/state change on the existing single view, not a new
  route.

## B. Backend API changes

- **New endpoint**: `GET /games/achievements-summary`. For every game
  returned by `get_owned_games()`, fetches achievement completion (reusing
  `get_game_achievements`), and returns a list of
  `{appid, unlocked, total, has_achievements}`. Wrapped in the new TTL cache.
  Games without achievements are included with `has_achievements: false` so
  the frontend can skip them in sort/filter/stats without an extra lookup.
- Added to `backend/app/routers/games.py` alongside the existing two routes,
  following the same error-handling pattern
  (`HTTPException(status_code=502, ...)` on failure).
- Kept separate from `GET /games` (the fast, always-needed owned-games list)
  rather than merged into it, so the game list still renders instantly while
  the slower fan-out (one Steam call per game) resolves in the background for
  sort/stats.

## C. Frontend: data layer & features

- **New hook** `useAchievementsSummary()` (in `frontend/src/hooks`) —
  fetches `/games/achievements-summary` once on mount, mirroring the
  existing `useGames` hook. Returns a map keyed by `appid`. Loads in the
  background; the base game list (from `useGames`) is not blocked by it.
- **Sort/filter** (in `GameList`): a control row above the existing search
  box. Sort by *Playtime* (default, matches current behavior), *Name*, or
  *Completion %* (disabled until the summary hook resolves). A toggle "Only
  games with achievements" filters using `has_achievements` from the
  summary.
- **Library stats overview**: shown in the main panel when no game is
  selected, replacing today's static "select a game" placeholder. Shows
  total games, total hours (sum of `playtime_forever` from `useGames`), and
  overall completion (sum unlocked / sum total across the summary). Reuses
  the existing `StatPill` component from `AchievementPanel`.
- **Achievement search**: a search input at the top of the achievement list
  in `AchievementPanel`, filtering the already-fetched `data.achievements`
  client-side by `display_name` / `description` — no backend change, same
  pattern as the existing game-list search.

## D. Responsiveness & visual polish

- **Responsive layout**: `Home` uses a Tailwind `md:` breakpoint to switch
  between layouts. Below `md`: only one pane renders at a time, driven by
  the existing `selectedGame` state — no selection shows a full-width
  `GameList`, a selection shows a full-width `AchievementPanel` with a back
  button (clears `selectedGame`) in its header. At `md` and above: both
  panes render side-by-side as they do today, and the back button is
  hidden.
- **Visual polish**: replace the current plain-text loading states
  ("Loading library...", "Loading achievements...") with skeleton
  placeholders shaped like `GameCard` rows / achievement rows, using
  Tailwind's `animate-pulse`. Existing error and empty states are kept but
  restyled with Tailwind. Add a subtle `transition-opacity` when switching
  selected games, consistent with the progress-bar transition already
  present in `AchievementPanel`.

## Testing

No test suite exists yet in either the backend or frontend. This pass is
verified manually: run the dev server, exercise sort/filter/search/stats
overview/responsive breakpoints/back button against real Steam data.
Introducing a test framework is a separate decision affecting the whole
project and is out of scope here.
