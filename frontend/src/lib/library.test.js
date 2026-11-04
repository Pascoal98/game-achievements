import { test, expect } from 'vitest';
import { coverSources, backdropSource, assetUrl, completionOf, filterAndSortGames } from './library';

const opts = (overrides) => ({ search: '', sortBy: 'playtime', onlyWithAchievements: false, ...overrides });

const games = [
    { appid: 1, name: 'Alpha', playtime_forever: 0, rtime_last_played: 0 },
    { appid: 2, name: 'beta', playtime_forever: 50, rtime_last_played: 100 },
    { appid: 3, name: 'Gamma', playtime_forever: 5, rtime_last_played: 200 },
];

const STEAM_CDN = 'https://cdn.cloudflare.steamstatic.com/steam/apps';
const rpcs3Game = { appid: 'rpcs3-BCES01284', source: 'rpcs3', banner_url: '/rpcs3/images/BCES01284/icon0', backdrop_url: '/rpcs3/images/BCES01284/pic1' };

test('coverSources puts the Steam vertical cover before the landscape header', () => {
    expect(coverSources({ appid: 10, source: 'steam' }, 'http://h')).toEqual([
        { url: `${STEAM_CDN}/10/library_600x900.jpg`, portrait: true },
        { url: `${STEAM_CDN}/10/header.jpg`, portrait: false },
    ]);
});

test('coverSources uses the backend-served banner for RPCS3 games', () => {
    expect(coverSources(rpcs3Game, 'http://h')).toEqual([{ url: 'http://h/rpcs3/images/BCES01284/icon0', portrait: false }]);
    expect(coverSources({ ...rpcs3Game, banner_url: null }, 'http://h')).toEqual([]);
});

test('backdropSource is the Steam header or the RPCS3 background', () => {
    expect(backdropSource({ appid: 10, source: 'steam' }, 'http://h')).toBe(`${STEAM_CDN}/10/header.jpg`);
    expect(backdropSource(rpcs3Game, 'http://h')).toBe('http://h/rpcs3/images/BCES01284/pic1');
    expect(backdropSource({ ...rpcs3Game, backdrop_url: null }, 'http://h')).toBeNull();
});

test('completionOf handles missing and zero-total', () => {
    expect(completionOf(undefined)).toBeNull();
    expect(completionOf({ unlocked: 0, total: 0 })).toBeNull();
    expect(completionOf({ unlocked: 1, total: 3 })).toBe(33);
});

test('lastPlayed sort puts never-played last', () => {
    const ids = filterAndSortGames(games, {}, opts({ sortBy: 'lastPlayed' })).map(g => g.appid);
    expect(ids).toEqual([3, 2, 1]);
});

test('playtime sort is descending and name sort is alphabetical', () => {
    expect(filterAndSortGames(games, {}, opts()).map(g => g.appid)).toEqual([2, 3, 1]);
    expect(filterAndSortGames(games, {}, opts({ sortBy: 'name' })).map(g => g.appid)).toEqual([1, 2, 3]);
});

test('search is case-insensitive', () => {
    expect(filterAndSortGames(games, {}, opts({ search: 'BET' })).map(g => g.appid)).toEqual([2]);
});

test('completion sort puts games with unknown completion last', () => {
    const summary = { 1: { unlocked: 1, total: 4, has_achievements: true }, 3: { unlocked: 3, total: 4, has_achievements: true } };
    expect(filterAndSortGames(games, summary, opts({ sortBy: 'completion' })).map(g => g.appid)).toEqual([3, 1, 2]);
});

test('onlyWithAchievements filters by summary', () => {
    const summary = { 2: { unlocked: 0, total: 3, has_achievements: true }, 3: { unlocked: 0, total: 0, has_achievements: false } };
    expect(filterAndSortGames(games, summary, opts({ onlyWithAchievements: true })).map(g => g.appid)).toEqual([2]);
});

test('assetUrl resolves backend-relative paths against the API base and leaves absolute URLs alone', () => {
    expect(assetUrl('/rpcs3/images/X/trophies/S/1', 'http://h')).toBe('http://h/rpcs3/images/X/trophies/S/1');
    expect(assetUrl('https://cdn.example/icon.jpg', 'http://h')).toBe('https://cdn.example/icon.jpg');
    expect(assetUrl('', 'http://h')).toBe('');
});
