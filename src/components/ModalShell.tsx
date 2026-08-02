import React, { ReactNode, useEffect } from 'react';

interface ModalShellProps {
  children: ReactNode;
  onClose: () => void;
  maxWidthClass?: string;
  panelClassName?: string;
  ariaLabel: string;
}

export const ModalShell: React.FC<ModalShellProps> = ({
  children,
  onClose,
  maxWidthClass = 'sm:max-w-md',
  panelClassName = '',
  ariaLabel,
}) => {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/80 backdrop-blur-sm sm:items-center sm:p-4 animate-fade-in"
      onClick={(event) => event.target === event.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
    >
      <div
        className={`w-full ${maxWidthClass} max-h-[92dvh] overflow-y-auto overscroll-contain rounded-t-3xl border border-slate-800 bg-slate-900 p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-2xl sm:rounded-3xl ${panelClassName}`}
      >
        {children}
      </div>
    </div>
  );
};
