import { useEffect, useRef } from 'react';

export default function SlideOver({ open, onClose, labelledBy, children }) {
    const rootRef = useRef(null);
    const panelRef = useRef(null);
    const onCloseRef = useRef(onClose);

    useEffect(() => {
        onCloseRef.current = onClose;
    });

    useEffect(() => {
        if (!open) return;
        const opener = document.activeElement;
        // Everything beside the overlay is the page behind it; making it inert keeps Tab inside the dialog.
        const background = [...rootRef.current.parentElement.children]
            .filter(el => el !== rootRef.current && !el.hasAttribute('inert'));
        background.forEach(el => el.setAttribute('inert', ''));
        panelRef.current?.focus({ preventScroll: true });

        const onKeyDown = (e) => { if (e.key === 'Escape') onCloseRef.current(); };
        window.addEventListener('keydown', onKeyDown);
        return () => {
            window.removeEventListener('keydown', onKeyDown);
            // Lift inert before refocusing: an inert element can't take focus.
            background.forEach(el => el.removeAttribute('inert'));
            if (opener instanceof HTMLElement) opener.focus({ preventScroll: true });
        };
    }, [open]);

    return (
        <div ref={rootRef} className={`fixed inset-0 z-40 ${open ? '' : 'pointer-events-none'}`} inert={!open}>
            <div
                onClick={onClose}
                className={`absolute inset-0 bg-black/60 transition-opacity duration-200 motion-reduce:transition-none ${
                    open ? 'opacity-100' : 'opacity-0'
                }`}
            />
            <div
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={labelledBy}
                tabIndex={-1}
                className={`absolute right-0 top-0 h-full w-full overflow-hidden border-l border-border bg-bg-app shadow-2xl outline-none transition-transform duration-200 motion-reduce:transition-none md:w-[520px] ${
                    open ? 'translate-x-0' : 'translate-x-full'
                }`}
            >
                {children}
            </div>
        </div>
    );
}
