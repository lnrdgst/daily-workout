import { useState } from 'react';
import { Check, ChevronDown, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { workouts } from '@/data/workouts';
import { cardioModalities } from '@/data/cardio';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { useWorkoutStore } from '@/hooks/useWorkoutStore';
import { getLatestSession, getSessionName, isStrengthHistory } from '@/utils/sessions';
import { isSameLocalDay } from '@/utils/localDate';
import { formatLastWorkoutTiming } from '@/utils/workoutTiming';
import { getWorkoutSequenceProgress } from '@/utils/workoutSequence';
import { WorkoutCard } from '@/components/WorkoutCard';
import { WorkoutProgress } from '@/components/WorkoutProgress';

export const HomePage = () => {
  const { state } = useWorkoutStore();
  const [userPreferences] = useUserPreferences();
  const [openCategory, setOpenCategory] = useState<'cardio' | 'strength' | null>('strength');
  const toggleCategory = (category: 'cardio' | 'strength') =>
    setOpenCategory((current) => current === category ? null : category);
  const lastWorkout = getLatestSession(state.history);
  const strengthHistory = state.history.filter(isStrengthHistory);
  const sequenceProgress = getWorkoutSequenceProgress(state.history);
  const sequenceSteps = ['A', 'B', 'C'] as const;
  const now = new Date();
  const trainedToday = state.history.some((session) => isSameLocalDay(new Date(session.finishedAt), now));
  const hour = now.getHours();
  const greeting = hour >= 5 && hour < 12 ? 'Bom dia' : hour >= 12 && hour < 18 ? 'Boa tarde' : 'Boa noite';
  const displayName = userPreferences.displayName.trim();
  const greetingLabel = displayName ? `${greeting}, ${displayName}` : greeting;
  const welcomeTitle = state.activeDraft
    ? state.activeDraft.type === 'cardio'
      ? `${getSessionName(state.activeDraft)} em andamento.`
      : `Seu ${getSessionName(state.activeDraft)} está em andamento.`
    : trainedToday
      ? 'Treino de hoje concluído.'
      : 'Pronto para o próximo treino?';
  const welcomeDescription = !state.activeDraft && trainedToday
    ? 'Se quiser treinar novamente, seus próximos treinos continuam disponíveis abaixo.'
    : 'Registre suas cargas, repetições e acompanhe sua evolução a cada sessão.';

  return (
    <div className="space-y-5">
      <section className="panel overflow-hidden p-5">
        <p className="break-words text-xs uppercase tracking-[0.3em] text-accent-300/80">{greetingLabel}</p>
        <h2 className="mt-2 text-3xl font-bold leading-tight">{welcomeTitle}</h2>
        <p className="mt-3 text-sm text-zinc-400">
          {welcomeDescription}
        </p>
      </section>


      <section className="panel p-5">
        <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">Sequência ABC</p>
        <p className="mt-2 text-sm text-zinc-400">Complete os treinos A, B e C em ordem para concluir uma sequência. Não importa o intervalo entre os dias.</p>
        <div className="mt-4 flex items-center gap-2 text-sm font-semibold" aria-label={`Progresso atual da sequência: ${sequenceProgress.currentStep} de 3 etapas concluídas`}>
          {sequenceSteps.map((step, index) => {
            const isComplete = index < sequenceProgress.currentStep;
            
            return (
              <div key={step} className="contents">
                <span className={`inline-flex min-w-10 items-center justify-center rounded-xl px-2 py-1.5 ${isComplete ? 'bg-accent-500/15 text-accent-300' : 'bg-white/5 text-zinc-400'}`}>
                  {step} {isComplete ? '✓' : '○'}
                </span>
                {index < sequenceSteps.length - 1 && <span className="text-zinc-600">→</span>}
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-sm text-zinc-300">
          {sequenceProgress.completedSequences} sequência{sequenceProgress.completedSequences === 1 ? '' : 's'} concluída{sequenceProgress.completedSequences === 1 ? '' : 's'}
        </p>
      </section>
          

      {!state.activeDraft && (
        <section className={`panel p-5 ${lastWorkout ? 'border-l-2 border-l-accent-500/70' : ''}`}>
          <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">Último treino concluído</p>
          {lastWorkout ? (
            <div className="mt-2">
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                <h3 className="min-w-0 break-words text-lg font-bold">{lastWorkout.workoutName}</h3>
                <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-accent-300">
                  <Check size={14} aria-hidden="true" />
                  Concluído
                </span>
              </div>
              <p className="text-sm text-zinc-400">
                {formatLastWorkoutTiming(lastWorkout.startedAt, lastWorkout.finishedAt, now)}
              </p>
            </div>
          ) : (
            <p className="mt-2 text-sm text-zinc-400">Você ainda não concluiu nenhum treino.</p>
          )}
        </section>
      )}

      {state.activeDraft && state.activeDraft.type !== 'cardio' && <WorkoutProgress draft={state.activeDraft} />}
      <section className="space-y-3">
        <h2>
          <button type="button" id="cardio-category-heading" aria-expanded={openCategory === 'cardio'}
            aria-controls="cardio-category-content" onClick={() => toggleCategory('cardio')}
            className="panel flex min-h-12 w-full items-center justify-between gap-3 p-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400">
            <span className="min-w-0">
              <span className="block text-xs uppercase tracking-[0.24em] text-accent-300">Aeróbico</span>
              <span className="mt-1 block text-sm text-zinc-400">{Object.keys(cardioModalities).length} atividades</span>
            </span>
            {openCategory === 'cardio' ? <ChevronDown className="shrink-0 text-zinc-300" size={20} aria-hidden="true" /> : <ChevronRight className="shrink-0 text-zinc-300" size={20} aria-hidden="true" />}
          </button>
        </h2>
        <div id="cardio-category-content" role="region" aria-labelledby="cardio-category-heading" hidden={openCategory !== 'cardio'}>
          <div className="panel grid gap-2 p-4">
          {Object.entries(cardioModalities).map(([modality, name]) => (
            <Link key={modality} to={`/cardio/${modality}`} className="touch-button justify-start bg-white/5 text-zinc-100">
              {name}
            </Link>
          ))}
          </div>
        </div>
      </section>
      <section className="space-y-3">
        <h2>
          <button type="button" id="strength-category-heading" aria-expanded={openCategory === 'strength'}
            aria-controls="strength-category-content" onClick={() => toggleCategory('strength')}
            className="panel flex min-h-12 w-full items-center justify-between gap-3 p-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400">
            <span className="min-w-0">
              <span className="block text-xs uppercase tracking-[0.24em] text-accent-300">Musculação</span>
              <span className="mt-1 block text-sm text-zinc-400">Treinos A · B · C</span>
            </span>
            {openCategory === 'strength' ? <ChevronDown className="shrink-0 text-zinc-300" size={20} aria-hidden="true" /> : <ChevronRight className="shrink-0 text-zinc-300" size={20} aria-hidden="true" />}
          </button>
        </h2>
        <div id="strength-category-content" role="region" aria-labelledby="strength-category-heading" hidden={openCategory !== 'strength'}>
          <div className="space-y-4">
        {workouts.map((workout) => (
          <WorkoutCard
            key={workout.id}
            workout={workout}
            lastSession={[...strengthHistory].reverse().find((session) => session.workoutId === workout.id) ?? null}
            completedSessionCount={strengthHistory.filter((session) => session.workoutId === workout.id).length}
          />
        ))}
          </div>
        </div>
      </section>
    </div>
  );
};
