import { useId } from 'react';
import type { ExerciseSetLog } from '@/types/workout';

interface SetRowProps {
  index: number;
  set: ExerciseSetLog;
  previousSet?: ExerciseSetLog;
  onChange: (patch: Partial<ExerciseSetLog>) => void;
  onToggleCompleted: () => void;
}

export const SetRow = ({ index, set, previousSet, onChange, onToggleCompleted }: SetRowProps) => {
  const repsId = useId();
  const adjustReps = (delta: number) => {
    const current = Number(set.reps);
    const next = Math.max(0, (Number.isFinite(current) ? Math.trunc(current) : 0) + delta);
    onChange({ reps: String(next) });
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-zinc-100">Série {index + 1}</p>
          <p className="text-xs text-zinc-500">
            Anterior: {previousSet?.load || '-'} kg • {previousSet?.reps || '-'} reps
          </p>
        </div>
        <button
          type="button"
          onClick={onToggleCompleted}
          className={`touch-button min-w-20 px-3 py-2 text-xs font-semibold ${
            set.completed ? 'bg-success text-white' : 'bg-white/10 text-zinc-200'
          }`}
        >
          {set.completed ? 'Feita' : 'Marcar'}
        </button>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_minmax(140px,1.2fr)] gap-3">
        <label className="min-w-0 space-y-2">
          <span className="text-xs uppercase tracking-[0.18em] text-zinc-500">Carga</span>
          <input
            type="number"
            inputMode="decimal"
            value={set.load}
            onChange={(event) => onChange({ load: event.target.value })}
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white outline-none transition focus:border-accent-400"
            placeholder="kg"
          />
        </label>

        <div className="min-w-0 space-y-2">
          <label htmlFor={repsId} className="text-xs uppercase tracking-[0.18em] text-zinc-500">Reps</label>
          <div className="flex items-center overflow-hidden rounded-2xl border border-white/10 bg-white/5 transition focus-within:border-accent-400">
            <button
              type="button"
              aria-label="Diminuir repetições"
              onClick={() => adjustReps(-1)}
              className="min-h-12 w-11 shrink-0 touch-manipulation text-xl text-zinc-200 transition hover:bg-white/10 active:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-400"
            >
              <span aria-hidden="true">−</span>
            </button>
            <input
              id={repsId}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={set.reps}
              onChange={(event) => {
                const value = event.target.value;
                if (/^\d*$/.test(value) && Number.isFinite(Number(value))) {
                  onChange({ reps: value });
                }
              }}
              className="min-w-0 w-full bg-transparent py-3 text-center text-base tabular-nums text-white outline-none focus-visible:bg-white/5"
              placeholder="0"
            />
            <button
              type="button"
              aria-label="Aumentar repetições"
              onClick={() => adjustReps(1)}
              className="min-h-12 w-11 shrink-0 touch-manipulation text-xl text-zinc-200 transition hover:bg-white/10 active:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-400"
            >
              <span aria-hidden="true">+</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
