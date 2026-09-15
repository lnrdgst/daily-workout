import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { IntegerStepper } from '@/components/IntegerStepper';
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
    <div className="mt-4 grid grid-cols-1 gap-3 min-[400px]:grid-cols-2">
      {([['Horas', hours, setHours, undefined], ['Minutos', minutes, setMinutes, 59]] as const).map(([label, value, setValue, max]) => (
        <IntegerStepper key={label} label={label} value={value} max={max}
          decreaseLabel={`Diminuir ${label.toLowerCase()}`} increaseLabel={`Aumentar ${label.toLowerCase()}`}
          describedBy={error ? 'cardio-recovery-error' : undefined} invalid={Boolean(error)}
          onChange={(next) => { setValue(next); setError(''); }} />
      ))}
    </div>
    {error && <p id="cardio-recovery-error" role="alert" className="mt-3 text-sm text-danger">{error}</p>}
  </ConfirmDialog>;
};
