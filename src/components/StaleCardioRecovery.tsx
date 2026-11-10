import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { IntegerStepper } from '@/components/IntegerStepper';
import { SetNumericKeypad } from '@/components/SetNumericKeypad';
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
  const [editing, setEditing] = useState<'hours' | 'minutes' | null>(null);
  const lastEdited = useRef<typeof editing>(null);
  const fieldRef = useRef<HTMLButtonElement>(null);
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

  const fields = [
    { key: 'hours', label: 'Horas', unit: 'h', value: hours, change: setHours, max: undefined },
    { key: 'minutes', label: 'Minutos', unit: 'min', value: minutes, change: setMinutes, max: 59 },
  ] as const;
  const field = fields.find(({ key }) => key === editing);
  if (field) return <SetNumericKeypad title="Quanto tempo você treinou?" label={field.label} unit={field.unit}
    value={field.value} mode="integer" onCancel={() => setEditing(null)} onConfirm={(value) => {
      field.change(value);
      setError('');
      setEditing(null);
    }} />;

  return <ConfirmDialog key="duration" open title="Quanto tempo você treinou?" initialFocusRef={fieldRef}
    description="Informe aproximadamente a duração real da atividade."
    cancelLabel="Cancelar" onCancel={() => { lastEdited.current = null; setStage('decision'); setError(''); }}
    confirmLabel="Registrar atividade" onConfirm={confirm}>
    <div className="mt-4 grid grid-cols-1 gap-3 min-[400px]:grid-cols-2">
      {fields.map(({ key, label, value, change, max }) => (
        <IntegerStepper key={key} label={label} value={value} max={max}
          decreaseLabel={`Diminuir ${label.toLowerCase()}`} increaseLabel={`Aumentar ${label.toLowerCase()}`}
          describedBy={error ? 'cardio-recovery-error' : undefined} invalid={Boolean(error)}
          editor={{ mode: 'integer', label: `${label}. Valor atual: ${value || 'vazio'}`,
            ref: lastEdited.current === key ? fieldRef : undefined,
            open: () => { lastEdited.current = key; setEditing(key); } }}
          onChange={(next) => { change(next); setError(''); }} />
      ))}
    </div>
    {error && <p id="cardio-recovery-error" role="alert" className="mt-3 text-sm text-danger">{error}</p>}
  </ConfirmDialog>;
};
