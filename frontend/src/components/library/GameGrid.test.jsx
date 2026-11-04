// @vitest-environment jsdom
import { test, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import GameGrid from './GameGrid';

afterEach(cleanup);

const renderGrid = (summaryState) => render(
    <GameGrid games={[]} loading={false} error={null} summary={{}} now={0} onSelect={() => {}} {...summaryState} />
);

test('while the summary loads, completion sort and the achievements filter say they are loading', () => {
    renderGrid({ summaryLoading: true, summaryError: null });
    const option = screen.getByRole('option', { name: 'Completion (loading…)' });
    expect(option.disabled).toBe(true);
    expect(screen.getByRole('checkbox', { name: 'Only games with achievements (loading…)' }).disabled).toBe(true);
});

test('when the summary fails, they say they are unavailable', () => {
    renderGrid({ summaryLoading: false, summaryError: new Error('502') });
    expect(screen.getByRole('option', { name: 'Completion (unavailable)' }).disabled).toBe(true);
    expect(screen.getByRole('checkbox', { name: 'Only games with achievements (unavailable)' }).disabled).toBe(true);
});

test('once the summary has loaded, they are enabled with plain labels', () => {
    renderGrid({ summaryLoading: false, summaryError: null });
    expect(screen.getByRole('option', { name: 'Completion' }).disabled).toBe(false);
    expect(screen.getByRole('checkbox', { name: 'Only games with achievements' }).disabled).toBe(false);
});
