// @vitest-environment jsdom
import { test, expect, afterEach, beforeEach, vi } from 'vitest';
import { renderHook, waitFor, act, cleanup } from '@testing-library/react';
import { useNowPlaying } from './useNowPlaying';

const reply = (body, ok = true) => vi.fn(async () => ({ ok, json: async () => body }));
const setHidden = (hidden) => Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });

beforeEach(() => setHidden(false));
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });

test('returns the appid Steam reports you are in', async () => {
    vi.stubGlobal('fetch', reply({ appid: 570, name: 'Dota 2' }));
    const { result } = renderHook(() => useNowPlaying());
    await waitFor(() => expect(result.current).toBe(570));
});

test('a failed check means not live rather than a stale game', async () => {
    vi.stubGlobal('fetch', reply({}, false));
    const { result } = renderHook(() => useNowPlaying());
    await waitFor(() => expect(fetch).toHaveBeenCalled());
    expect(result.current).toBeNull();
});

test('checks again every minute, but not while the tab is hidden', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', reply({ appid: null, name: null }));
    renderHook(() => useNowPlaying());
    expect(fetch).toHaveBeenCalledTimes(1);
    await act(() => vi.advanceTimersByTimeAsync(60_000));
    expect(fetch).toHaveBeenCalledTimes(2);
    setHidden(true);
    await act(() => vi.advanceTimersByTimeAsync(60_000));
    expect(fetch).toHaveBeenCalledTimes(2);
});
