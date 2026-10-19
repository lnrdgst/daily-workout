import { IntegerStepper } from '@/components/IntegerStepper';
import { SetNumericKeypad } from '@/components/SetNumericKeypad';
import { useState } from 'react';
import { formatSetNumber } from '@/utils/setNumericEntry';
import type { ExerciseSetLog } from '@/types/workout';

interface SetRowProps {
  index: number;
  exerciseName: string;
  isNextPending: boolean;
  set: ExerciseSetLog;
  previousSet?: ExerciseSetLog;
  onChange: (patch: Partial<ExerciseSetLog>) => void;
  onToggleCompleted: () => void;
}

export const SetRow = ({ index, exerciseName, isNextPending, set, previousSet, onChange, onToggleCompleted }: SetRowProps) => {
  const [editingField, setEditingField] = useState<'load' | 'reps' | null>(null);

  return (
    <div className={`rounded-2xl border p-3 transition-colors duration-200 motion-reduce:transition-none ${
      set.completed ? 'border-accent-500 bg-zinc-950/70' : 'border-white/10 bg-black/20'
    }`}>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="text-sm font-medium text-zinc-100">Série {index + 1}</p>
            {isNextPending && <span className="text-xs text-zinc-400">Próxima série</span>}
          </div>
          <p className="text-xs text-zinc-500">
            Anterior: {formatSetNumber(previousSet?.load ?? '') || '-'} kg • {formatSetNumber(previousSet?.reps ?? '') || '-'} reps
          </p>
        </div>
        <button
          type="button"
          onClick={onToggleCompleted}
          className={`touch-button min-w-20 px-3 py-2 text-xs font-semibold ${
            set.completed ? 'bg-success text-surface-950' : 'bg-white/10 text-zinc-200'
          }`}
        >
          {set.completed ? 'Feita' : 'Marcar'}
        </button>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_minmax(140px,1.2fr)] gap-3">
        <div className="min-w-0 space-y-2">
          <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Carga</p>
          <button type="button" aria-haspopup="dialog" onClick={() => setEditingField('load')}
            aria-label={`Editar carga de ${exerciseName}, série ${index + 1}. Valor atual: ${formatSetNumber(set.load) || 'vazio'} kg`}
            className="min-h-12 w-full break-all rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left text-base text-white outline-none transition focus-visible:border-accent-400 focus-visible:ring-2 focus-visible:ring-accent-400">
            {formatSetNumber(set.load) || <span className="text-zinc-400">kg</span>}
          </button>
        </div>

        <IntegerStepper label="Reps" decreaseLabel="Diminuir repetições" increaseLabel="Aumentar repetições"
          value={set.reps} onChange={(reps) => onChange({ reps })}
          editor={{ open: () => setEditingField('reps'), label: `Editar repetições de ${exerciseName}, série ${index + 1}. Valor atual: ${formatSetNumber(set.reps) || 'vazio'}` }} />
      </div>
      {editingField && <SetNumericKeypad key={editingField} exerciseName={exerciseName} seriesNumber={index + 1}
        field={editingField} value={set[editingField]}
        onConfirm={(value) => {
          if (value !== set[editingField]) onChange({ [editingField]: value });
          setEditingField(null);
        }}
        onCancel={() => setEditingField(null)} />}
    </div>
  );
};
