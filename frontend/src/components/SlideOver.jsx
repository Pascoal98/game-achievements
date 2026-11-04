import { useEffect, useRef } from 'react';

export default function SlideOver({ open, onClose, children }) {
    const panelRef = useRef(null);

    useEffect(() => {
        if (!open) return;
        panelRef.current?.focus();
        const onKeyDown = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [open, onClose]);

    return (
        <div className={`fixed inset-0 z-40 ${open ? '' : 'pointer-events-none'}`} inert={!open}>
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
