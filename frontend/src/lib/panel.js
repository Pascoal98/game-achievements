export const initialPanelState = { game: null, open: false, openCount: 0 };

export function panelReducer(state, action) {
    switch (action.type) {
        case 'open':
            return { game: action.game, open: true, openCount: state.openCount + 1 };
        case 'close':
            // Keep the game so the panel's content stays visible during the exit slide.
            return { ...state, open: false };
        default:
            throw new Error(`Unknown panel action: ${action.type}`);
    }
}

// A fresh key per open remounts the panel, so reopening after a failed load refetches.
export function panelKey(state) {
    return state.game ? `${state.game.appid}-${state.openCount}` : null;
}
