// @vitest-environment jsdom
import { test, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import PlatformTile from './PlatformTile';

afterEach(cleanup);

test('the heading carries total playtime across stores', () => {
    render(<PlatformTile games={[{ source: 'steam', playtime_forever: 153_660 }, { source: 'rpcs3', playtime_forever: 912 }]} />);
    expect(screen.getByRole('heading').textContent).toBe('Where you play · 2,576h total');
});
