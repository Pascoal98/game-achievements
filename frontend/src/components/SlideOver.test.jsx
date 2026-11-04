// @vitest-environment jsdom
import { test, expect, afterEach } from 'vitest';
import { useState } from 'react';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import SlideOver from './SlideOver';

afterEach(cleanup);

function Page() {
    const [open, setOpen] = useState(false);
    return (
        <div>
            <main>
                <button type="button" onClick={() => setOpen(true)}>Open game</button>
            </main>
            <SlideOver open={open} onClose={() => setOpen(false)} labelledBy="panel-title">
                <h2 id="panel-title">Portal 2</h2>
                <button type="button" onClick={() => setOpen(false)}>Close</button>
            </SlideOver>
        </div>
    );
}

test('closing returns focus to the element that opened the panel', () => {
    render(<Page />);
    const trigger = screen.getByRole('button', { name: 'Open game' });
    act(() => trigger.focus());
    fireEvent.click(trigger);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(document.activeElement).toBe(trigger);
});

test('the page behind an open panel is inert, and stops being inert on close', () => {
    const { container } = render(<Page />);
    const main = container.querySelector('main');
    fireEvent.click(screen.getByRole('button', { name: 'Open game' }));
    expect(main.hasAttribute('inert')).toBe(true);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(main.hasAttribute('inert')).toBe(false);
});

test('the dialog is named by its heading', () => {
    render(<Page />);
    fireEvent.click(screen.getByRole('button', { name: 'Open game' }));
    expect(screen.getByRole('dialog', { name: 'Portal 2' })).toBeTruthy();
});
