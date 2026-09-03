import { useState } from 'react';
import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useWorkoutStore } from '@/hooks/useWorkoutStore';
import type { WorkoutSessionHistory } from '@/types/workout';
import { formatWorkoutTimeRange } from '@/utils/workoutTiming';

type HistoryMonthGroup = {
  key: string;
  year: number;
  month: number;
  sessions: WorkoutSessionHistory[];
};

type HistoryYearGroup = {
  year: number;
  months: HistoryMonthGroup[];
};

const formatMonthTitle = (year: number, month: number) =>
  new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date(year, month)).toUpperCase();

const formatShortDate = (date: Date) =>
  new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(date);

const getMonthSummary = (sessions: WorkoutSessionHistory[]) => {
  const sessionCount = sessions.length;
  const latestDate = new Date(sessions[0].finishedAt);
  const earliestDate = new Date(sessions[sessions.length - 1].finishedAt);

  return `${sessionCount} ${sessionCount === 1 ? 'treino' : 'treinos'} · ${formatShortDate(earliestDate)} a ${formatShortDate(latestDate)}`;
};

const groupHistoryByMonth = (history: WorkoutSessionHistory[]): HistoryYearGroup[] => {
  const monthsByKey = new Map<string, HistoryMonthGroup>();

  [...history]
    .sort((first, second) => new Date(second.finishedAt).getTime() - new Date(first.finishedAt).getTime())
    .forEach((session) => {
      const finishedAt = new Date(session.finishedAt);
      const year = finishedAt.getFullYear();
      const month = finishedAt.getMonth();
      const key = `${year}-${month}`;
      const group = monthsByKey.get(key);

      if (group) {
        group.sessions.push(session);
        return;
      }

      monthsByKey.set(key, { key, year, month, sessions: [session] });
    });

  const yearsByValue = new Map<number, HistoryYearGroup>();
  [...monthsByKey.values()]
    .sort((first, second) => second.year - first.year || second.month - first.month)
    .forEach((month) => {
      const group = yearsByValue.get(month.year);
      if (group) {
        group.months.push(month);
        return;
      }

      yearsByValue.set(month.year, { year: month.year, months: [month] });
    });

  return [...yearsByValue.values()].sort((first, second) => second.year - first.year);
};

type HistorySessionCardProps = {
  session: WorkoutSessionHistory;
  isExpanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
};

const HistorySessionCard = ({ session, isExpanded, onToggle, onDelete }: HistorySessionCardProps) => {
  const timing = formatWorkoutTimeRange(session.startedAt, session.finishedAt);
  const [timeRange, duration] = timing?.split(' · ') ?? [];
  const detailsId = `history-session-${session.id}`;

  return (
    <article className="panel p-4">
      <div className="flex flex-wrap items-start gap-2">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={isExpanded}
          aria-controls={detailsId}
          className="flex min-w-0 basis-48 flex-1 shrink-0 items-start justify-between gap-3 rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400/70"
        >
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.24em] text-accent-300">{session.workoutName}</p>
            <h3 className="mt-1 text-lg font-bold">{new Date(session.finishedAt).toLocaleDateString('pt-BR')}</h3>
            {timing ? (
              <div className="mt-1 text-xs text-zinc-500">
                <p className="whitespace-nowrap">{timeRange}</p>
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
          onClick={onDelete}
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
};

export const HistoryPage = () => {
  const { state, deleteHistoryEntry } = useWorkoutStore();
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);
  const [expandedYear, setExpandedYear] = useState<number | null>(null);
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);
  const yearGroups = groupHistoryByMonth(state.history);
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const toggleMonth = (monthKey: string) => {
    setExpandedMonth((current) => (current === monthKey ? null : monthKey));
    setExpandedHistoryId(null);
  };

  const toggleYear = (year: number) => {
    setExpandedYear((current) => (current === year ? null : year));
    setExpandedMonth(null);
    setExpandedHistoryId(null);
  };

  const renderSessions = (sessions: WorkoutSessionHistory[]) => (
    <div className="space-y-3">
      {sessions.map((session) => (
        <HistorySessionCard
          key={session.id}
          session={session}
          isExpanded={expandedHistoryId === session.id}
          onToggle={() => setExpandedHistoryId((current) => (current === session.id ? null : session.id))}
          onDelete={() => setSelectedEntryId(session.id)}
        />
      ))}
    </div>
  );

  const renderMonthAccordion = (month: HistoryMonthGroup) => {
    const isExpanded = expandedMonth === month.key;
    const monthId = `history-month-${month.key}`;

    return (
      <section key={month.key} className="rounded-2xl bg-white/[0.03] px-4 py-3">
        <button
          type="button"
          onClick={() => toggleMonth(month.key)}
          aria-expanded={isExpanded}
          aria-controls={monthId}
          className="flex w-full items-center justify-between gap-3 rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400/70"
        >
          <div>
            <p className="text-xs font-semibold tracking-[0.18em] text-zinc-200">{formatMonthTitle(month.year, month.month)}</p>
            <p className="mt-1 text-xs text-zinc-500">{getMonthSummary(month.sessions)}</p>
          </div>
          {isExpanded ? <ChevronUp size={20} className="shrink-0 text-zinc-300" aria-hidden="true" /> : <ChevronDown size={20} className="shrink-0 text-zinc-300" aria-hidden="true" />}
        </button>
        {isExpanded && <div id={monthId} className="mt-4">{renderSessions(month.sessions)}</div>}
      </section>
    );
  };

  return (
    <div className="space-y-4">
      <section className="panel p-5">
        <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">Histórico</p>
        <h2 className="mt-1 text-2xl font-bold">Sessões registradas</h2>
        <p className="mt-2 text-sm text-zinc-400">Veja data, treino, cargas e repetições realizadas em cada exercício.</p>
      </section>

      {yearGroups.length === 0 ? (
        <section className="panel p-5 text-sm text-zinc-400">Nenhum treino concluído ainda.</section>
      ) : (
        yearGroups.map((yearGroup) => {
          if (yearGroup.year === currentYear) {
            return (
              <section key={yearGroup.year} className="space-y-3">
                {yearGroup.months.map((month) =>
                  month.month === currentMonth ? (
                    <section key={month.key} className="space-y-3">
                      <div className="px-1">
                        <p className="text-xs font-semibold tracking-[0.18em] text-zinc-200">{formatMonthTitle(month.year, month.month)}</p>
                        <p className="mt-1 text-xs text-zinc-500">{getMonthSummary(month.sessions)}</p>
                      </div>
                      {renderSessions(month.sessions)}
                    </section>
                  ) : (
                    renderMonthAccordion(month)
                  ),
                )}
              </section>
            );
          }

          const isExpanded = expandedYear === yearGroup.year;
          const yearId = `history-year-${yearGroup.year}`;
          const monthCount = yearGroup.months.length;
          const sessionCount = yearGroup.months.reduce((total, month) => total + month.sessions.length, 0);

          return (
            <section key={yearGroup.year} className="panel p-4">
              <button
                type="button"
                onClick={() => toggleYear(yearGroup.year)}
                aria-expanded={isExpanded}
                aria-controls={yearId}
                className="flex w-full items-center justify-between gap-3 rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400/70"
              >
                <div>
                  <p className="text-lg font-bold">{yearGroup.year}</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {monthCount} {monthCount === 1 ? 'mês com registros' : 'meses com registros'} · {sessionCount}{' '}
                    {sessionCount === 1 ? 'treino' : 'treinos'}
                  </p>
                </div>
                {isExpanded ? <ChevronUp size={20} className="shrink-0 text-zinc-300" aria-hidden="true" /> : <ChevronDown size={20} className="shrink-0 text-zinc-300" aria-hidden="true" />}
              </button>
              {isExpanded && (
                <div id={yearId} className="mt-4 space-y-3">
                  {yearGroup.months.map(renderMonthAccordion)}
                </div>
              )}
            </section>
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
