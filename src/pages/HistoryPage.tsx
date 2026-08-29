import { useState } from 'react';
import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useWorkoutStore } from '@/hooks/useWorkoutStore';
import { formatWorkoutTimeRange } from '@/utils/workoutTiming';

export const HistoryPage = () => {
  const { state, deleteHistoryEntry } = useWorkoutStore();
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);
  const history = [...state.history].reverse();

  return (
    <div className="space-y-4">
      <section className="panel p-5">
        <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">Histórico</p>
        <h2 className="mt-1 text-2xl font-bold">Sessões registradas</h2>
        <p className="mt-2 text-sm text-zinc-400">Veja data, treino, cargas e repetições realizadas em cada exercício.</p>
      </section>

      {history.length === 0 ? (
        <section className="panel p-5 text-sm text-zinc-400">Nenhum treino concluído ainda.</section>
      ) : (
        history.map((session) => {
          const timing = formatWorkoutTimeRange(session.startedAt, session.finishedAt);
          const [timeRange, duration] = timing?.split(' \u00b7 ') ?? [];
          const isExpanded = expandedHistoryId === session.id;
          const detailsId = `history-session-${session.id}`;

          return (
            <article key={session.id} className="panel p-4">
              <div className="flex items-start gap-2">
                <button
                  type="button"
                  onClick={() => setExpandedHistoryId((current) => (current === session.id ? null : session.id))}
                  aria-expanded={isExpanded}
                  aria-controls={detailsId}
                  className="flex min-w-0 flex-1 items-start justify-between gap-3 rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400/70"
                >
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-[0.24em] text-accent-300">{session.workoutName}</p>
                    <h3 className="mt-1 text-lg font-bold">{new Date(session.finishedAt).toLocaleDateString('pt-BR')}</h3>
                    {timing ? (
                      <div className="mt-1 text-xs text-zinc-500">
                        <p>{timeRange}</p>
                        {duration && <p className="mt-0.5 whitespace-nowrap text-zinc-600">{duration}</p>}
                      </div>
                    ) : (
                      <p className="mt-1 text-sm text-zinc-400">
                        {new Date(session.finishedAt).toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2 text-zinc-300">
                    <span className="rounded-full bg-white/5 px-3 py-2 text-xs">{session.exercises.length} exercícios</span>
                    {isExpanded ? <ChevronUp size={20} aria-hidden="true" /> : <ChevronDown size={20} aria-hidden="true" />}
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedEntryId(session.id)}
                  className="inline-flex min-h-9 items-center gap-1 rounded-lg bg-transparent px-2 py-1.5 text-xs font-medium text-danger/70 transition hover:bg-danger/10 hover:text-danger/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/40 active:bg-danger/15"
                  aria-label={`Excluir ${session.workoutName} do histórico`}
                >
                  <Trash2 size={16} aria-hidden="true" />
                  Excluir
                </button>
              </div>

              <div
                id={detailsId}
                className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none ${
                  isExpanded ? 'mt-4 grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                }`}
              >
                <div className="min-h-0 overflow-hidden">
                  <div className="space-y-3">
                    {session.exercises.map((exercise) => (
                      <div key={exercise.exerciseId} className="rounded-2xl border border-white/10 bg-black/20 p-3">
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <div>
                            <h4 className="font-semibold">{exercise.exerciseName}</h4>
                            <p className="text-xs text-zinc-500">{exercise.muscleGroup}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-sm text-zinc-300">
                          {exercise.sets.map((set, index) => (
                            <div key={`${exercise.exerciseId}-${index}`} className="rounded-2xl bg-white/5 p-3">
                              <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Série {index + 1}</p>
                              <p className="mt-1 font-medium">{set.load || '-'} kg</p>
                              <p className="text-zinc-400">{set.reps || '-'} reps</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </article>
          );
        })
      )}

      <ConfirmDialog
        open={selectedEntryId !== null}
        title="Excluir treino do histórico?"
        description="Este registro será removido permanentemente do histórico local. Esta ação não pode ser desfeita."
        cancelLabel="Cancelar"
        confirmLabel="Excluir registro"
        destructive
        onCancel={() => setSelectedEntryId(null)}
        onConfirm={() => {
          if (selectedEntryId) {
            deleteHistoryEntry(selectedEntryId);
            if (expandedHistoryId === selectedEntryId) {
              setExpandedHistoryId(null);
            }
          }
          setSelectedEntryId(null);
        }}
      />
    </div>
  );
};
