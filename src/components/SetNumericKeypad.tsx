import { useEffect, useId, useRef, useState } from 'react';
import { Delete, X } from 'lucide-react';
import { confirmNumericEntry, createNumericEntry, editNumericEntry } from '@/utils/setNumericEntry';

interface SetNumericKeypadProps {
  exerciseName: string;
  seriesNumber: number;
  field: 'load' | 'reps';
  value: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
}

export const SetNumericKeypad = ({ exerciseName, seriesNumber, field, value, onConfirm, onCancel }: SetNumericKeypadProps) => {
  const id = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const valueRef = useRef<HTMLOutputElement>(null);
  const confirmedRef = useRef(false);
  const [entry, setEntry] = useState(() => createNumericEntry(value));
  const normalized = confirmNumericEntry(entry.value);
  const fieldLabel = field === 'load' ? 'Carga' : 'Repetições';
  const unit = field === 'load' ? 'kg' : 'reps';
  const typeKey = (key: string) => setEntry((current) => editNumericEntry(current, key));
  const confirm = () => {
    if (normalized === null || confirmedRef.current) return;
    confirmedRef.current = true;
    onConfirm(normalized);
  };

  useEffect(() => {
    const previousFocus = document.activeElement;
    const previousOverflow = document.documentElement.style.overflow;
    const dialog = dialogRef.current;
    dialog?.showModal();
    document.documentElement.style.overflow = 'hidden';
    valueRef.current?.focus({ preventScroll: true });
    return () => {
      dialog?.close();
      document.documentElement.style.overflow = previousOverflow;
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-context`}
      onCancel={(event) => { event.preventDefault(); onCancel(); }}
      onKeyDown={(event) => {
        if (event.altKey || event.ctrlKey || event.metaKey) return;
        if (/^\d$/.test(event.key) || event.key === ',' || event.key === '.') {
          event.preventDefault();
          typeKey(event.key);
        } else if (event.key === 'Backspace' || event.key === 'Delete') {
          event.preventDefault();
          typeKey(event.key === 'Delete' ? 'clear' : 'backspace');
        } else if (event.key === 'Enter') {
          event.preventDefault();
          confirm();
        } else if (event.key === 'Escape') {
          event.preventDefault();
          onCancel();
        }
      }}
      className="fixed inset-x-0 bottom-0 top-auto m-0 mx-auto max-h-[100dvh] w-full max-w-md overflow-y-auto overscroll-contain rounded-t-3xl border border-white/10 bg-surface-900 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] text-zinc-100 shadow-glow backdrop:bg-black/70"
    >
      <header className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p id={`${id}-context`} className="text-sm text-accent-300">Série {seriesNumber} · {fieldLabel} ({unit})</p>
          <h2 id={`${id}-title`} className="mt-1 break-words text-lg font-bold">{exerciseName}</h2>
        </div>
        <button type="button" onClick={onCancel} aria-label="Cancelar edição" className="touch-button shrink-0 bg-white/5 p-3">
          <X size={20} aria-hidden="true" />
        </button>
      </header>

      <output ref={valueRef} tabIndex={-1} aria-label={`Valor temporário de ${fieldLabel.toLowerCase()}`} aria-live="polite"
        className="block max-h-24 overflow-y-auto break-all rounded-2xl border border-accent-400/50 bg-black/20 px-4 py-2 text-right text-3xl font-bold tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-accent-400">
        {entry.value || '—'} <span className="text-sm font-normal text-zinc-400">{unit}</span>
      </output>
      <p className="mb-3 mt-2 text-xs text-zinc-400">
        {entry.replaceOnInput ? 'O primeiro dígito substitui o valor atual.' : 'Valor temporário. Confirme para salvar.'}
      </p>

      <div className="grid grid-cols-3 gap-2">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', ',', '0', 'backspace'].map((key) => (
          <button key={key} type="button" onClick={() => typeKey(key)}
            aria-label={key === 'backspace' ? 'Apagar último caractere' : key === ',' ? 'Vírgula decimal' : key}
            className="touch-button touch-manipulation bg-white/5 py-2 text-xl hover:bg-accent-500/15 active:bg-accent-500/25">
            {key === 'backspace' ? <Delete size={22} aria-hidden="true" /> : key}
          </button>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button type="button" onClick={() => typeKey('clear')} className="touch-button bg-white/10">Limpar</button>
        <button type="button" onClick={confirm} disabled={normalized === null} className="touch-button accent-solid disabled:opacity-50">Confirmar</button>
      </div>
    </dialog>
  );
};
