// @vitest-environment jsdom
import { test, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import GameCoverCard from './GameCoverCard';

afterEach(cleanup);

const renderCard = (game) => render(
    <GameCoverCard game={game} summaryItem={undefined} summaryLoading={false} now={0} onClick={() => {}} />
);

test('an RPCS3 card shows the store label and its banner with the name overlaid', () => {
    const { container } = renderCard({
        appid: 'rpcs3-BCES01284',
        name: 'Sly Cooper: Thieves in Time',
        source: 'rpcs3',
        playtime_forever: 789,
        rtime_last_played: 0,
        banner_url: '/rpcs3/images/BCES01284/icon0',
        backdrop_url: null,
    });
    expect(screen.getByText('RPCS3')).toBeTruthy();
    expect(container.querySelector('img').getAttribute('src')).toMatch(/\/rpcs3\/images\/BCES01284\/icon0$/);
    expect(screen.getAllByText('Sly Cooper: Thieves in Time')).toHaveLength(2);
});

test('a Steam card has no store label and no overlay on its portrait cover', () => {
    renderCard({ appid: 730, name: 'Counter-Strike 2', source: 'steam', playtime_forever: 60, rtime_last_played: 0 });
    expect(screen.queryByText('RPCS3')).toBeNull();
    expect(screen.getAllByText('Counter-Strike 2')).toHaveLength(1);
});

test('a perfect game gets a brass ring on its cover', () => {
    const { container } = render(
        <GameCoverCard game={{ appid: 730, name: 'CS2', source: 'steam', playtime_forever: 60, rtime_last_played: 0 }}
            summaryItem={{ unlocked: 5, total: 5, has_achievements: true }} summaryLoading={false} now={0} onClick={() => {}} />
    );
    expect(container.querySelector('.aspect-\\[2\\/3\\]').classList).toContain('ring-accent');
});

const cardWith = (summaryItem) => render(
    <GameCoverCard game={{ appid: 730, name: 'CS2', source: 'steam', playtime_forever: 60, rtime_last_played: 0 }}
        summaryItem={summaryItem} summaryLoading={false} now={0} onClick={() => {}} />
);

test('a game one achievement short of 200 is not marked perfect', () => {
    const { container } = cardWith({ unlocked: 199, total: 200, has_achievements: true });
    expect(container.querySelector('.aspect-\\[2\\/3\\]').classList).not.toContain('ring-accent');
});

test('an in-progress completion bar is neutral, not brass', () => {
    const { container } = cardWith({ unlocked: 12, total: 100, has_achievements: true });
    const fill = container.querySelector('[style*="width: 12%"]');
    expect(fill.classList).not.toContain('bg-accent');
    expect(fill.classList).not.toContain('bg-success');
});
