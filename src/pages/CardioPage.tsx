import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CardioIntervals } from '@/components/CardioIntervals';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { MainNavigation } from '@/components/MainNavigation';
import { cardioModalities, isCardioModality } from '@/data/cardio';
import { useWorkoutDuration } from '@/hooks/useWorkoutDuration';
import { useWorkoutStore } from '@/hooks/useWorkoutStore';
import { useWorkoutPreviewNavigation } from '@/hooks/useWorkoutPreviewNavigation';
import { getSessionPath } from '@/utils/sessions';
import { isShortCardioSession } from '@/utils/cardioSession';
import type { CardioData } from '@/types/workout';

const numericFields = [
  ['distanceKm', 'Distância (km)'], ['averageSpeedKmH', 'Velocidade média (km/h)'], ['resistance', 'Resistência'],
] as const;

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
                <Link to={getSessionPath(state.activeDraft)} className="touch-button mt-4 w-full bg-accent-500 text-white">Voltar ao treino</Link>
              </>
            ) : <button type="button" onClick={() => startCardio(modality)} className="touch-button mt-5 w-full bg-accent-500 text-white">Iniciar treino</button>}
          </>
        )}
      </section>
      {!draft && (
        <button type="button" onClick={backToWorkouts} className="touch-button w-full bg-white/10 text-base text-zinc-100">
          Voltar para treinos
        </button>
      )}
      {draft && (
        <>
          <CardioIntervals key={draft.startedAt} draft={draft} />
          <section className="panel space-y-4 p-5">
            <h3 className="font-semibold">Dados da atividade <span className="text-xs font-normal text-zinc-500">Opcionais</span></h3>
            {numericFields.map(([key, label]) => (
              <label key={key} className="block text-sm text-zinc-300">{label}
                <input type="number" inputMode="decimal" min="0" step="any" value={draft[key] ?? ''} placeholder="Opcional"
                  onChange={(event) => {
                    const raw = event.target.value;
                    const value = raw === '' ? undefined : Number(raw);
                    if (value === undefined || (Number.isFinite(value) && value >= 0)) updateCardio({ [key]: value } as Partial<CardioData>);
                  }} className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-base outline-none focus:border-accent-400" />
              </label>
            ))}
            <label className="block text-sm text-zinc-300">Observações
              <textarea value={draft.notes ?? ''} onChange={(event) => updateCardio({ notes: event.target.value })} rows={3}
                placeholder="Opcional" className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-base outline-none focus:border-accent-400" />
            </label>
          </section>
          <button type="button" onClick={() => setDialog(isShortCardioSession(draft) ? 'short' : 'finish')} className="touch-button w-full bg-accent-500 text-base font-semibold text-white">Finalizar treino</button>
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
