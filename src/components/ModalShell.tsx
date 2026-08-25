import React, { ReactNode, useEffect, useRef } from 'react';

interface ModalShellProps { children: ReactNode; onClose: () => void; maxWidthClass?: string; panelClassName?: string; ariaLabel: string; triggerRef?: React.RefObject<HTMLElement>; }

export const ModalShell: React.FC<ModalShellProps> = ({ children, onClose, maxWidthClass = 'sm:max-w-md', panelClassName = '', ariaLabel, triggerRef }) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    previousFocus.current = document.activeElement as HTMLElement;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus();
    return () => { document.body.style.overflow = prev; previousFocus.current?.focus(); };
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-[#1A1D2E]/60 backdrop-blur-sm animate-fade-in" onClick={(e) => e.target === e.currentTarget && onClose()} role="dialog" aria-modal="true" aria-label={ariaLabel}>
      <div ref={panelRef} tabIndex={-1} role="dialog" aria-modal="true" className={`w-full ${maxWidthClass} max-h-[90dvh] overflow-y-auto overscroll-contain rounded-3xl border border-line bg-card p-6 shadow-xl outline-none ${panelClassName}`}>{children}</div>
    </div>
  );
};
