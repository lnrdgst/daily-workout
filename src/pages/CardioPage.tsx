import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CardioIntervals } from '@/components/CardioIntervals';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { MainNavigation } from '@/components/MainNavigation';
import { SetNumericKeypad } from '@/components/SetNumericKeypad';
import { ViewBackButton } from '@/components/ViewBackButton';
import { cardioModalities, isCardioModality, isTreadmillActivity, treadmillActivities } from '@/data/cardio';
import { useWorkoutDuration } from '@/hooks/useWorkoutDuration';
import { useWorkoutStore } from '@/hooks/useWorkoutStore';
import { useWorkoutPreviewNavigation } from '@/hooks/useWorkoutPreviewNavigation';
import { getSessionPath } from '@/utils/sessions';
import { isShortCardioSession } from '@/utils/cardioSession';
import { formatSetNumber, numberToDecimalString } from '@/utils/setNumericEntry';
import type { CardioData, CardioSessionDraft } from '@/types/workout';

const numericFields = [
  { key: 'distanceKm', label: 'Distância', unit: 'km' },
  { key: 'averageSpeedKmH', label: 'Velocidade média', unit: 'km/h' },
  { key: 'resistance', label: 'Resistência', unit: undefined },
] as const;

const metricButtonClass = 'touch-button mt-2 w-full justify-start break-all rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-base focus-visible:border-accent-400';

const CardioActivityFields = ({ draft, updateCardio }: { draft: CardioSessionDraft; updateCardio: (patch: Partial<CardioData>) => void }) => {
  const [editing, setEditing] = useState<(typeof numericFields)[number] | null>(null);
  const metricValue = (key: (typeof numericFields)[number]['key']) =>
    draft[key] === undefined ? '' : numberToDecimalString(draft[key]);

  return (
    <section className="panel space-y-4 p-5">
      <h3 className="font-semibold">Dados da atividade <span className="text-xs font-normal text-zinc-500">Opcionais</span></h3>
      {draft.modality === 'treadmill' && (
        <label className="block text-sm text-zinc-300">Tipo de atividade na esteira
          <select value={draft.treadmillActivity ?? ''} onChange={({ target: { value } }) => {
            if (value === '' || isTreadmillActivity(value)) updateCardio({ treadmillActivity: value || undefined });
          }} className="mt-2 w-full rounded-2xl border border-white/10 bg-surface-800 px-4 py-3 text-base focus-visible:border-accent-400">
            <option value="">Não informado</option>
            {Object.entries(treadmillActivities).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
        </label>
      )}
      {numericFields.map((field) => {
        const { key, label, unit } = field;
        const value = formatSetNumber(metricValue(key));
        const fieldLabel = unit ? `${label} (${unit})` : label;
        return <div key={key} className="text-sm text-zinc-300">
          <span>{fieldLabel}</span>
          <button type="button" aria-haspopup="dialog" aria-label={`${fieldLabel}. Valor atual: ${value || 'vazio'}`}
            onClick={(event) => { event.currentTarget.focus({ preventScroll: true }); setEditing(field); }}
            className={metricButtonClass}>
            {value || <span className="text-zinc-400">Opcional</span>}
          </button>
        </div>;
      })}
      <label className="block text-sm text-zinc-300">Observações
        <textarea value={draft.notes ?? ''} onChange={(event) => updateCardio({ notes: event.target.value })} rows={3}
          placeholder="Opcional" className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-base outline-none focus:border-accent-400" />
      </label>
      {editing && <SetNumericKeypad title={cardioModalities[draft.modality]} label={editing.label} unit={editing.unit}
        mode="decimal" value={metricValue(editing.key)} onCancel={() => setEditing(null)} onConfirm={(value) => {
          updateCardio({ [editing.key]: value === '' ? undefined : Number(value) });
          setEditing(null);
        }} />}
    </section>
  );
};

export const CardioPage = () => {
  const { modality } = useParams();
  const navigate = useNavigate();
  const { state, startCardio, updateCardio, finishWorkout, discardDraft } = useWorkoutStore();
  const backToWorkouts = useWorkoutPreviewNavigation(Boolean(state.activeDraft));
  const draft = state.activeDraft?.type === 'cardio' && state.activeDraft.modality === modality ? state.activeDraft : null;
  const duration = useWorkoutDuration(draft?.startedAt);
  const [dialog, setDialog] = useState<'finish' | 'discard' | 'short' | null>(null);

  if (!isCardioModality(modality)) return <section className="panel p-5">Atividade não encontrada. <Link to="/">Voltar</Link></section>;
  const name = cardioModalities[modality];

  return (
    <div className="space-y-4 pb-8">
      {!draft && <ViewBackButton onClick={backToWorkouts} />}
      {draft && <MainNavigation className="grid grid-cols-3 gap-2 rounded-2xl border border-white/10 bg-surface-900/80 p-2" />}
      <section className={draft ? 'panel sticky top-2 z-10 bg-zinc-950/95 p-4' : 'panel p-5'}>
        {draft ? (
          <div className="flex items-center justify-between gap-3">
            <h2 className="min-w-0 text-xs uppercase tracking-[0.12em] text-accent-300">{name} em andamento</h2>
            <span className="shrink-0 text-xl font-bold tabular-nums"><span className="sr-only">Duração total: </span>{duration}</span>
          </div>
        ) : (
          <>
            <p className="text-xs uppercase tracking-[0.24em] text-accent-300">Aeróbico</p>
            <h2 className="mt-2 text-2xl font-bold">{name}</h2>
            <p className="mt-3 text-sm text-zinc-400">Treine continuamente ou configure tiros durante a atividade. Os dados são opcionais.</p>
            {state.activeDraft ? (
              <>
                <p className="mt-3 text-sm text-zinc-300">Há um treino em andamento. Finalize ou descarte essa sessão antes de iniciar outra.</p>
                <Link to={getSessionPath(state.activeDraft)} className="touch-button mt-4 w-full accent-solid">Voltar ao treino</Link>
              </>
            ) : <button type="button" onClick={() => startCardio(modality)} className="touch-button mt-5 w-full accent-solid">Iniciar treino</button>}
          </>
        )}
      </section>
      {draft && (
        <>
          <CardioIntervals key={draft.startedAt} draft={draft} />
          <CardioActivityFields key={draft.startedAt} draft={draft} updateCardio={updateCardio} />
          <button type="button" onClick={() => setDialog(isShortCardioSession(draft) ? 'short' : 'finish')} className="touch-button w-full accent-solid text-base font-semibold">Finalizar treino</button>
          <button type="button" onClick={() => setDialog('discard')} className="touch-button w-full bg-white/5 text-zinc-300">Descartar treino</button>
        </>
      )}
      <ConfirmDialog open={dialog === 'finish'} title="Finalizar treino aeróbico?"
        description={draft?.intervals
          ? 'A duração e os dados preenchidos serão registrados. Você pode finalizar mesmo sem completar todos os tiros.'
          : 'A duração e os dados preenchidos serão registrados no histórico.'}
        cancelLabel="Continuar treino" confirmLabel="Finalizar treino" onCancel={() => setDialog(null)}
        onConfirm={() => { finishWorkout(); navigate('/history'); }} />
      <ConfirmDialog open={dialog === 'short'} title="Encerrar treino sem registrar?"
        description="Este treino durou menos de 1 minuto e não será registrado no histórico. Deseja encerrar mesmo assim?" destructive
        cancelLabel="Continuar treino" confirmLabel="Encerrar sem registrar" onCancel={() => setDialog(null)}
        onConfirm={() => { discardDraft(); navigate('/'); }} />
      <ConfirmDialog open={dialog === 'discard'} title="Descartar treino aeróbico?"
        description="Esta sessão será encerrada sem registrar no histórico." destructive
        cancelLabel="Continuar treino" confirmLabel="Descartar treino" onCancel={() => setDialog(null)}
        onConfirm={() => { discardDraft(); navigate('/'); }} />
    </div>
  );
};
