'use client';

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface DrawerShellProps {
  open: boolean;
  onClose: () => void;
  ariaLabel: string;
  className?: string;
  children: React.ReactNode;
}

/**
 * Reusable right-side slide-in drawer shell.
 * Provides: backdrop overlay, aside panel, 300ms transitions, Escape key, body scroll lock.
 */
export function DrawerShell({ open, onClose, ariaLabel, className, children }: DrawerShellProps) {
  // Lock body scroll when open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Close on Escape (stable ref avoids re-registering listener on every render)
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onCloseRef.current();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/30 transition-opacity duration-300',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sidebar panel */}
      <aside
        className={cn(
          'fixed inset-y-0 right-0 z-50 flex w-115 max-w-[85vw] flex-col bg-white shadow-[4px_0_16px_rgba(0,0,0,0.15)] transition-transform duration-300',
          open ? 'translate-x-0' : 'translate-x-full',
          className,
        )}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
      >
        {children}
      </aside>
    </>
  );
}
