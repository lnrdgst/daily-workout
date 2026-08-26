import { useState } from 'react';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useWorkoutStore } from '@/hooks/useWorkoutStore';
import { getLastWorkout } from '@/utils/storage';
import { formatWorkoutTimeRange } from '@/utils/workoutTiming';

export const SettingsPage = () => {
  const { state, clearHistory, discardDraft } = useWorkoutStore();
  const [dialog, setDialog] = useState<'discard-draft' | 'clear-history' | null>(null);
  const lastWorkout = getLastWorkout(state.history, state.lastCompletedWorkoutId);
  const timing = lastWorkout ? formatWorkoutTimeRange(lastWorkout.startedAt, lastWorkout.finishedAt) : null;

  return (
    <div className="space-y-4">
      <section className="panel p-5">
        <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">Ajustes</p>
        <h2 className="mt-1 text-2xl font-bold">Controle local</h2>
        <p className="mt-2 text-sm text-zinc-400">Tudo fica salvo no seu aparelho usando `localStorage`.</p>
      </section>

      <section className="panel space-y-4 p-5">
        <div className="rounded-2xl bg-white/5 p-4">
          <p className="text-sm text-zinc-400">Último treino concluído</p>
          <p className="mt-1 text-lg font-semibold">{state.lastCompletedWorkoutId ? `Treino ${state.lastCompletedWorkoutId}` : 'Nenhum'}</p>
          {timing && <p className="mt-1 text-xs text-zinc-500">{timing}</p>}
        </div>
        <div className="rounded-2xl bg-white/5 p-4">
          <p className="text-sm text-zinc-400">Treinos concluídos - Total</p>
          <p className="mt-1 text-lg font-semibold">{state.history.length}</p>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3">
        {state.activeDraft && (
          <button type="button" onClick={() => setDialog('discard-draft')} className="touch-button bg-white/10 text-zinc-100">
            Limpar treino em andamento
          </button>
        )}
        <button type="button" onClick={() => setDialog('clear-history')} className="touch-button bg-danger text-white">
          Apagar histórico local
        </button>
      </section>

      <ConfirmDialog
        open={dialog === 'discard-draft'}
        title="Limpar treino em andamento?"
        description="Os dados ainda não finalizados deste treino serão perdidos."
        cancelLabel="Cancelar"
        confirmLabel="Limpar treino"
        destructive
        onCancel={() => setDialog(null)}
        onConfirm={() => {
          discardDraft();
          setDialog(null);
        }}
      />

      <ConfirmDialog
        open={dialog === 'clear-history'}
        title="Apagar histórico local?"
        description="Todo o histórico de treinos salvo neste dispositivo será removido. Essa ação não pode ser desfeita."
        cancelLabel="Cancelar"
        confirmLabel="Apagar histórico"
        destructive
        onCancel={() => setDialog(null)}
        onConfirm={() => {
          clearHistory();
          setDialog(null);
        }}
      />
    </div>
  );
};
