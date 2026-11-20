// @vitest-environment jsdom
import { test, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import UnlockHeatmapTile from './UnlockHeatmapTile';

afterEach(cleanup);

// The test script runs with TZ=UTC. 2024-01-04 was a Thursday.
const at = (iso) => Date.parse(iso) / 1000;
const summary = {
    1: { appid: 1, unlock_times: [at('2024-01-04T23:10:00Z'), at('2024-01-11T23:40:00Z'), at('2024-01-06T09:00:00Z')] },
};

test('the caption names the busiest weekday and hour, and only that cell is accented', () => {
    render(<UnlockHeatmapTile summary={summary} loading={false} error={null} />);
    expect(screen.getByText('Thursdays at 23:00').parentElement.textContent)
        .toBe('3 unlocks in your local time. Busiest on Thursdays at 23:00');
    const accented = screen.getAllByRole('gridcell').filter(c => c.classList.contains('bg-accent'));
    expect(accented.map(c => c.getAttribute('aria-label'))).toEqual(['Thu 23:00: 2 unlocks']);
});
