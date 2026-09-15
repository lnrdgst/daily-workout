import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useWorkoutStore } from '@/hooks/useWorkoutStore';
import { validateCardioRecovery } from '@/utils/cardioRecovery';
import type { CardioSessionDraft } from '@/types/workout';

export const StaleCardioRecovery = ({ draft, onClose }: { draft: CardioSessionDraft; onClose: () => void }) => {
  const { finishWorkout, discardDraft } = useWorkoutStore();
  const navigate = useNavigate();
  const [stage, setStage] = useState<'decision' | 'duration'>('decision');
  const [hours, setHours] = useState('0');
  const [minutes, setMinutes] = useState('');
  const [error, setError] = useState('');
  const confirm = () => {
    const h = /^\d+$/.test(hours) ? Number(hours) : NaN;
    const m = /^\d+$/.test(minutes) ? Number(minutes) : NaN;
    const result = validateCardioRecovery(draft.startedAt, h, m);
    if (result.error) { setError(result.error); return; }
    if (!finishWorkout({ modality: draft.modality, startedAt: draft.startedAt, hours: h, minutes: m })) {
      setError('Não foi possível registrar. Confira a duração e a sessão ativa.');
      return;
    }
    onClose();
    navigate('/history');
  };

  if (stage === 'decision') return <ConfirmDialog key="decision" open
    title="Atividade ainda em andamento"
    description="Esta atividade foi iniciada há pelo menos 2 horas. Talvez você tenha esquecido de finalizá-la."
    cancelLabel="Continuar atividade" onCancel={onClose}
    confirmLabel="Encerrar e registrar" onConfirm={() => setStage('duration')}
    additionalAction={{ label: 'Encerrar sem registrar', onClick: () => { discardDraft(); onClose(); navigate('/'); } }} />;

  return <ConfirmDialog key="duration" open title="Quanto tempo você treinou?"
    description="Informe aproximadamente a duração real da atividade."
    cancelLabel="Cancelar" onCancel={() => { setStage('decision'); setError(''); }}
    confirmLabel="Registrar atividade" onConfirm={confirm}>
    <div className="mt-4 grid grid-cols-2 gap-3">
      {([['Horas', hours, setHours, undefined], ['Minutos', minutes, setMinutes, 59]] as const).map(([label, value, setValue, max]) => (
        <label key={label} className="min-w-0 text-sm text-zinc-300">{label}
          <input type="number" inputMode="numeric" min="0" max={max} step="1" value={value}
            aria-describedby={error ? 'cardio-recovery-error' : undefined} aria-invalid={Boolean(error)}
            onChange={(event) => { setValue(event.target.value); setError(''); }}
            className="mt-2 min-h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-base outline-none focus:border-accent-400" />
        </label>
      ))}
    </div>
    {error && <p id="cardio-recovery-error" role="alert" className="mt-3 text-sm text-danger">{error}</p>}
  </ConfirmDialog>;
};
