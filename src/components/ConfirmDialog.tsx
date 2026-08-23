import { useEffect, useRef } from 'react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog = ({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) => {
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    cancelButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCancel, open]);

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
        <div className="mt-5 grid grid-cols-1 gap-3">
          <button ref={cancelButtonRef} type="button" onClick={onCancel} className="touch-button bg-white/10 text-zinc-100">
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`touch-button font-semibold text-white ${destructive ? 'bg-danger' : 'bg-accent-500'}`}
          >
            {confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
};
