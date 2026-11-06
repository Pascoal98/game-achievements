import { test, expect } from 'vitest';
import {
    playtimeTotals, platformSplit, topPlayed, mostRecentlyPlayed,
    completionTotals, mergeRecentUnlocks, unlockHeatmap,
    perfectGames, nextToComplete, achievementCounts,
} from './stats';

test('playtimeTotals treats missing playtime_2weeks as 0', () => {
    expect(playtimeTotals([{ playtime_forever: 60 }])).toEqual({
        lifetimeMinutes: 60, twoWeeksMinutes: 0, avgDailyMinutesTwoWeeks: 0,
    });
});

test('playtimeTotals averages the last two weeks over 14 days', () => {
    const t = playtimeTotals([{ playtime_forever: 500, playtime_2weeks: 140 }, { playtime_forever: 10, playtime_2weeks: 70 }]);
    expect(t).toEqual({ lifetimeMinutes: 510, twoWeeksMinutes: 210, avgDailyMinutesTwoWeeks: 15 });
});

test('platformSplit counts all Steam playtime as one Steam entry, including hours with no device recorded', () => {
    expect(platformSplit([{ playtime_forever: 100, playtime_windows_forever: 76 }])).toEqual([
        { key: 'steam', label: 'Steam', minutes: 100 },
    ]);
});

test('platformSplit folds every Steam device into the Steam entry', () => {
    const games = [
        { playtime_forever: 10, playtime_windows_forever: 8, playtime_deck_forever: 8 },
        { playtime_forever: 5, playtime_linux_forever: 5 },
    ];
    expect(platformSplit(games)).toEqual([{ key: 'steam', label: 'Steam', minutes: 15 }]);
});

test('platformSplit is empty when nothing has been played', () => {
    expect(platformSplit([{ playtime_forever: 0 }])).toEqual([]);
});

test('platformSplit separates Steam and RPCS3 playtime by source', () => {
    const games = [
        { source: 'steam', playtime_forever: 100 },
        { source: 'rpcs3', playtime_forever: 789 },
    ];
    expect(platformSplit(games)).toEqual([
        { key: 'steam', label: 'Steam', minutes: 100 },
        { key: 'rpcs3', label: 'RPCS3', minutes: 789 },
    ]);
});

test('topPlayed returns the n most played, excluding unplayed', () => {
    const games = [{ appid: 1, playtime_forever: 0 }, { appid: 2, playtime_forever: 9 }, { appid: 3, playtime_forever: 30 }, { appid: 4, playtime_forever: 20 }];
    expect(topPlayed(games, 2).map(g => g.appid)).toEqual([3, 4]);
    expect(topPlayed(games, 10).map(g => g.appid)).toEqual([3, 4, 2]);
});

test('mostRecentlyPlayed picks the latest and is null when nothing was played', () => {
    expect(mostRecentlyPlayed([{ appid: 1, rtime_last_played: 5 }, { appid: 2, rtime_last_played: 9 }]).appid).toBe(2);
    expect(mostRecentlyPlayed([{ appid: 1, rtime_last_played: 0 }])).toBeNull();
    expect(mostRecentlyPlayed([])).toBeNull();
});

test('completionTotals of an empty summary is all zeros', () => {
    expect(completionTotals({})).toEqual({ unlocked: 0, total: 0, pct: 0, perfectGames: 0 });
});

test('completionTotals sums and counts perfect games', () => {
    const summary = { 1: { unlocked: 4, total: 4 }, 2: { unlocked: 1, total: 4 }, 3: { unlocked: 0, total: 0 } };
    expect(completionTotals(summary)).toEqual({ unlocked: 5, total: 8, pct: 63, perfectGames: 1 });
});

test('mergeRecentUnlocks orders across games and respects n', () => {
    const u = (apiname, unlocktime) => ({ apiname, display_name: apiname, icon: '', unlocktime });
    const summary = { 1: { appid: 1, recent_unlocks: [u('a', 30), u('b', 10)] }, 2: { appid: 2, recent_unlocks: [u('c', 20)] } };
    const merged = mergeRecentUnlocks(summary, { 1: { name: 'One' } }, 2);
    expect(merged.map(m => [m.apiname, m.appid, m.gameName])).toEqual([['a', 1, 'One'], ['c', 2, '']]);
});

test('mergeRecentUnlocks keeps string ids from RPCS3 games', () => {
    const summary = { 'rpcs3-X': { appid: 'rpcs3-X', recent_unlocks: [{ apiname: 'NPWR:1', display_name: 'Vault', icon: '', unlocktime: 5 }] } };
    const merged = mergeRecentUnlocks(summary, { 'rpcs3-X': { name: 'Sly' } }, 8);
    expect(merged[0].appid).toBe('rpcs3-X');
    expect(merged[0].gameName).toBe('Sly');
});

test('mergeRecentUnlocks tolerates items without recent_unlocks', () => {
    expect(mergeRecentUnlocks({ 1: { unlocked: 0, total: 0 } }, {}, 5)).toEqual([]);
});

test('unlockHeatmap buckets by local weekday and hour', () => {
    const sundayAt15 = Date.UTC(2026, 10, 1, 15) / 1000;
    const grid = unlockHeatmap({ 1: { unlock_times: [sundayAt15, sundayAt15] } });
    expect(grid[0][15]).toBe(2);
    expect(grid.flat().reduce((a, b) => a + b, 0)).toBe(2);
});

test('unlockHeatmap of an empty summary is a 7x24 grid of zeros', () => {
    const grid = unlockHeatmap({});
    expect(grid).toHaveLength(7);
    expect(grid.every(row => row.length === 24 && row.every(v => v === 0))).toBe(true);
});

const item = (appid, unlocked, total, unlock_times = []) => ({ appid, unlocked, total, unlock_times });

test('perfectGames keeps only fully unlocked games, most recently completed first', () => {
    const summary = { 1: item(1, 5, 5, [100]), 2: item(2, 3, 5, [900]), 3: item(3, 4, 4, [500]), 4: item(4, 0, 0) };
    expect(perfectGames(summary).map(i => i.appid)).toEqual([3, 1]);
});

test('perfectGames puts a perfect game with no dated unlocks last', () => {
    const summary = { 'rpcs3-A': item('rpcs3-A', 2, 2, []), 1: item(1, 5, 5, [100]) };
    expect(perfectGames(summary).map(i => i.appid)).toEqual([1, 'rpcs3-A']);
});

test('nextToComplete ranks started, unfinished games by percentage, then fewest remaining', () => {
    const summary = {
        1: item(1, 71, 88),   // 80.7%
        2: item(2, 4, 5),     // 80%, 1 left
        3: item(3, 8, 10),    // 80%, 2 left
        4: item(4, 5, 5),     // perfect: excluded
        5: item(5, 0, 50),    // unstarted: excluded
        6: item(6, 0, 0),     // no achievements: excluded
    };
    expect(nextToComplete(summary, 3).map(i => i.appid)).toEqual([1, 2, 3]);
    expect(nextToComplete(summary, 1).map(i => i.appid)).toEqual([1]);
});

test('nextToComplete is empty when nothing qualifies', () => {
    expect(nextToComplete({ 1: item(1, 5, 5), 2: item(2, 0, 9) }, 3)).toEqual([]);
});

test('achievementCounts sums unlocks and counts games that have achievements', () => {
    expect(achievementCounts({ 1: item(1, 71, 88), 2: item(2, 0, 0), 3: item(3, 5, 5) })).toEqual({ unlocked: 76, games: 2 });
    expect(achievementCounts({})).toEqual({ unlocked: 0, games: 0 });
});
