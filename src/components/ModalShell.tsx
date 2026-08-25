import React, { ReactNode, useEffect } from 'react';

interface ModalShellProps { children: ReactNode; onClose: () => void; maxWidthClass?: string; panelClassName?: string; ariaLabel: string; }

export const ModalShell: React.FC<ModalShellProps> = ({ children, onClose, maxWidthClass = 'sm:max-w-md', panelClassName = '', ariaLabel }) => {
  useEffect(() => { const prev = document.body.style.overflow; document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = prev; }; }, []);
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-[#1A1D2E]/60 backdrop-blur-sm animate-fade-in" onClick={(e) => e.target === e.currentTarget && onClose()} role="dialog" aria-modal="true" aria-label={ariaLabel}>
      <div className={`w-full ${maxWidthClass} max-h-[90dvh] overflow-y-auto overscroll-contain rounded-3xl border border-line bg-card p-6 shadow-xl ${panelClassName}`}>{children}</div>
    </div>
  );
};
