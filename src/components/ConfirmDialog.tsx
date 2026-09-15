import { useContext, useEffect, useRef } from 'react';
import { DialogSuppressionContext } from '@/components/DialogSuppressionContext';
import type { ReactNode } from 'react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  destructive?: boolean;
  confirmDisabled?: boolean;
  children?: ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
  additionalAction?: { label: string; onClick: () => void };
}

export const ConfirmDialog = ({
  open: requestedOpen,
  title,
  description,
  confirmLabel,
  cancelLabel,
  destructive = false,
  confirmDisabled = false,
  children,
  onConfirm,
  onCancel,
  additionalAction,
}: ConfirmDialogProps) => {
  const suppressed = useContext(DialogSuppressionContext);
  const open = requestedOpen && !suppressed;
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const onCancelRef = useRef(onCancel);

  useEffect(() => {
    onCancelRef.current = onCancel;
  }, [onCancel]);

  useEffect(() => {
    if (!open) {
      return;
    }

    cancelButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCancelRef.current();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/70 p-4 sm:items-center sm:justify-center" role="presentation">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="w-full max-w-md rounded-3xl border border-white/10 bg-surface-800 p-5 shadow-glow"
      >
        <p className="text-xs uppercase tracking-[0.24em] text-accent-300">Confirmacao</p>
        <h2 id="confirm-dialog-title" className="mt-2 text-xl font-bold">
          {title}
        </h2>
        <p className="mt-2 text-sm leading-6 text-zinc-400">{description}</p>
        {children}
        <div className="mt-5 grid grid-cols-1 gap-3">
          <button ref={cancelButtonRef} type="button" onClick={onCancel} className="touch-button bg-white/10 text-zinc-100">
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={confirmDisabled}
            className={`touch-button font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 ${destructive ? 'bg-danger' : 'bg-accent-500'}`}
          >
            {confirmLabel}
          </button>
          {additionalAction && (
            <button type="button" onClick={additionalAction.onClick} className="touch-button bg-danger font-semibold text-white">
              {additionalAction.label}
            </button>
          )}
        </div>
      </section>
    </div>
  );
};
