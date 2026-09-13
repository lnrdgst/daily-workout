import { useEffect, useState } from 'react';
import { useWorkoutStore } from '@/hooks/useWorkoutStore';
import { formatWorkoutDuration } from '@/hooks/useWorkoutDuration';
import type { CardioSessionDraft } from '@/types/workout';

export const CardioIntervals = ({ draft }: { draft: CardioSessionDraft }) => {
  const { configureCardioIntervals, startCardioInterval, markCardioInterval, undoCardioInterval, cancelCardioInterval } = useWorkoutStore();
  const [editing, setEditing] = useState(false);
  const [target, setTarget] = useState(String(draft.intervals?.targetCount ?? 10));
  const [seconds, setSeconds] = useState(String(draft.intervals?.durationSeconds ?? 30));
  const [now, setNow] = useState(Date.now);
  const running = draft.intervalEndAt !== null;
  const intervals = draft.intervals;
  const remaining = Math.max(0, Math.ceil(((draft.intervalEndAt ?? now) - now) / 1000));
  const targetNumber = Number(target);
  const secondsNumber = Number(seconds);
  const valid = Number.isSafeInteger(targetNumber) && targetNumber > 0 && targetNumber >= (intervals?.completedCount ?? 0) &&
    Number.isSafeInteger(secondsNumber) && secondsNumber > 0 && secondsNumber <= 86400;

  useEffect(() => {
    if (!running) return;
    const update = () => setNow(Date.now());
    update();
    const timer = window.setInterval(update, 250);
    window.addEventListener('focus', update);
    document.addEventListener('visibilitychange', update);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', update);
      document.removeEventListener('visibilitychange', update);
    };
  }, [running, draft.intervalEndAt]);

  return (
    <section className="panel p-5">
      <h3 className="text-xs uppercase tracking-[0.24em] text-accent-300">Tiros opcionais</h3>
      {!intervals && !editing && (
        <>
          <p className="mt-2 text-sm text-zinc-400">Você pode treinar continuamente ou configurar tiros quando quiser.</p>
          <button type="button" onClick={() => setEditing(true)} className="touch-button mt-4 w-full bg-white/10">Configurar tiros</button>
        </>
      )}
      {editing && (
        <form className="mt-4 space-y-3" onSubmit={(event) => {
          event.preventDefault();
          if (!valid || running) return;
          configureCardioIntervals(targetNumber, secondsNumber);
          setEditing(false);
        }}>
          <div className="grid grid-cols-2 gap-3">
            <label className="min-w-0 text-sm text-zinc-300">Quantidade
              <input type="number" inputMode="numeric" min={Math.max(1, intervals?.completedCount ?? 0)} step="1" required value={target}
                onChange={(event) => setTarget(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 p-3" />
            </label>
            <label className="min-w-0 text-sm text-zinc-300">Duração (s)
              <input type="number" inputMode="numeric" min="1" max="86400" step="1" required value={seconds}
                onChange={(event) => setSeconds(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 p-3" />
            </label>
          </div>
          <div className="flex gap-2">
            {[30, 45, 60].map((value) => <button key={value} type="button" onClick={() => setSeconds(String(value))}
              aria-pressed={seconds === String(value)} className={`touch-button flex-1 ${seconds === String(value) ? 'bg-accent-500/20 text-accent-300' : 'bg-white/5'}`}>{value}s</button>)}
          </div>
          <p className="text-xs text-zinc-500">Duração personalizada em segundos, de 1s até 24h.</p>
          <button disabled={!valid || running} className="touch-button w-full bg-accent-500 text-white disabled:opacity-40">Salvar tiros</button>
          <button type="button" onClick={() => setEditing(false)} className="touch-button w-full bg-white/5">Cancelar</button>
        </form>
      )}
      {intervals && !editing && (
        <div className="mt-3 space-y-3">
          <p className="text-lg font-semibold">{intervals.completedCount} de {intervals.targetCount} concluídos</p>
          {running ? (
            <div className="rounded-2xl bg-black/20 p-4 text-center" role="timer" aria-label="Tempo restante do tiro">
              <p className="text-xs uppercase tracking-wider text-zinc-400">Tiro {intervals.completedCount + 1}/{intervals.targetCount}</p>
              <p className="mt-2 text-4xl font-bold tabular-nums text-accent-300">{formatWorkoutDuration(remaining)}</p>
            </div>
          ) : <p className="text-sm text-zinc-400">Duração do tiro: {intervals.durationSeconds}s</p>}
          {intervals.completedCount < intervals.targetCount && (
            <div className="grid gap-2">
              {!running && <button type="button" onClick={startCardioInterval} className="touch-button bg-accent-500 text-white">Iniciar tiro</button>}
              <button type="button" onClick={markCardioInterval} className="touch-button bg-white/10">Marcar tiro</button>
              {running && <button type="button" onClick={cancelCardioInterval} className="touch-button bg-white/5">Cancelar tiro</button>}
            </div>
          )}
          {!running && <div className="grid gap-2">
            {intervals.completedCount > 0 && <button type="button" onClick={undoCardioInterval} className="touch-button bg-white/5">Desfazer último tiro</button>}
            <button type="button" onClick={() => {
              setTarget(String(intervals.targetCount)); setSeconds(String(intervals.durationSeconds)); setEditing(true);
            }} className="touch-button bg-white/5">Editar planejamento</button>
          </div>}
        </div>
      )}
    </section>
  );
};
