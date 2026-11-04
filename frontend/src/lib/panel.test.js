import { test, expect } from 'vitest';
import { initialPanelState, panelReducer, panelKey } from './panel';

const game = { appid: 10, name: 'Game' };

test('reopening the same game after closing gives a new panel key, so achievements refetch', () => {
    const opened = panelReducer(initialPanelState, { type: 'open', game });
    const closed = panelReducer(opened, { type: 'close' });
    const reopened = panelReducer(closed, { type: 'open', game });
    expect(reopened.open).toBe(true);
    expect(panelKey(reopened)).not.toBe(panelKey(opened));
});

test('closing keeps the game so content stays visible while the panel slides out', () => {
    const closed = panelReducer(panelReducer(initialPanelState, { type: 'open', game }), { type: 'close' });
    expect(closed.open).toBe(false);
    expect(closed.game).toBe(game);
});

test('panelKey is null before any game is opened', () => {
    expect(panelKey(initialPanelState)).toBeNull();
});
