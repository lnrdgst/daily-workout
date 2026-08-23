import type { ExerciseSetLog } from '@/types/workout';

interface SetRowProps {
  index: number;
  set: ExerciseSetLog;
  previousSet?: ExerciseSetLog;
  onChange: (patch: Partial<ExerciseSetLog>) => void;
  onToggleCompleted: () => void;
}

export const SetRow = ({ index, set, previousSet, onChange, onToggleCompleted }: SetRowProps) => {
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

      <div className="grid grid-cols-2 gap-3">
        <label className="space-y-2">
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

        <label className="space-y-2">
          <span className="text-xs uppercase tracking-[0.18em] text-zinc-500">Reps</span>
          <input
            type="number"
            inputMode="numeric"
            value={set.reps}
            onChange={(event) => onChange({ reps: event.target.value })}
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white outline-none transition focus:border-accent-400"
            placeholder="0"
          />
        </label>
      </div>
    </div>
  );
};
