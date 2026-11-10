import { useEffect, useState } from 'react';
import { useWorkoutStore } from '@/hooks/useWorkoutStore';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { SetNumericKeypad } from '@/components/SetNumericKeypad';
import { formatWorkoutDuration } from '@/hooks/useWorkoutDuration';
import type { CardioSessionDraft } from '@/types/workout';

export const CardioIntervals = ({ draft }: { draft: CardioSessionDraft }) => {
  const { configureCardioIntervals, startCardioInterval, markCardioInterval, undoCardioInterval, cancelCardioInterval, removeCardioIntervals } = useWorkoutStore();
  const [confirmRemoval, setConfirmRemoval] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editingNumber, setEditingNumber] = useState<'target' | 'seconds' | null>(null);
  const [target, setTarget] = useState(String(draft.intervals?.targetCount ?? 10));
  const [seconds, setSeconds] = useState(String(draft.intervals?.durationSeconds ?? 30));
  const [now, setNow] = useState(Date.now);
  const running = draft.intervalEndAt !== null;
  const intervals = draft.intervals;
  const removePlan = () => {
    removeCardioIntervals();
    setConfirmRemoval(false);
    setEditing(false);
  };
  const requestRemoval = () => {
    if ((intervals?.completedCount ?? 0) > 0) setConfirmRemoval(true);
    else removePlan();
  };
  const remaining = Math.max(0, Math.ceil(((draft.intervalEndAt ?? now) - now) / 1000));
  const targetNumber = Number(target);
  const secondsNumber = Number(seconds);
  const minimumTarget = Math.max(1, intervals?.completedCount ?? 0);
  const validTarget = Number.isSafeInteger(targetNumber) && targetNumber >= minimumTarget;
  const validSeconds = Number.isSafeInteger(secondsNumber) && secondsNumber > 0 && secondsNumber <= 86400;

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
    <>
    <section className="panel p-5">
      <h3 className="text-xs uppercase tracking-[0.24em] text-accent-300">Tiros opcionais</h3>
      {!intervals && !editing && (
        <>
          <p className="mt-2 text-sm text-zinc-400">Você pode treinar continuamente ou configurar tiros quando quiser.</p>
          <button type="button" onClick={() => setEditing(true)} className="touch-button mt-4 w-full border border-accent-500 bg-white/5 text-accent-500">Configurar tiros</button>
        </>
      )}
      {editing && (
        <form className="mt-4 space-y-3" onSubmit={(event) => {
          event.preventDefault();
          if (!validTarget || !validSeconds || running) return;
          configureCardioIntervals(targetNumber, secondsNumber);
          setEditing(false);
        }}>
          <div className="grid grid-cols-2 gap-3">
            {([
              ['target', 'Quantidade', target, validTarget, `Informe pelo menos ${minimumTarget}.`],
              ['seconds', 'Duração (s)', seconds, validSeconds, 'Informe de 1 a 86.400 segundos.'],
            ] as const).map(([field, label, value, valid, error]) => (
              <div key={field} className="min-w-0 text-sm text-zinc-300">
                <span>{label}</span>
                <button type="button" aria-haspopup="dialog" aria-label={`${label}. Valor atual: ${value || 'vazio'}`}
                  aria-invalid={!valid} aria-describedby={valid ? undefined : `cardio-interval-${field}-error`}
                  onClick={(event) => { event.currentTarget.focus({ preventScroll: true }); setEditingNumber(field); }}
                  className="touch-button mt-2 w-full justify-start break-all rounded-xl border border-white/10 bg-white/5 p-3">
                  {value || '—'}
                </button>
                {!valid && <p id={`cardio-interval-${field}-error`} className="mt-1 text-xs text-danger">{error}</p>}
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            {[30, 45, 60].map((value) => <button key={value} type="button" onClick={() => setSeconds(String(value))}
              aria-pressed={seconds === String(value)} className={`touch-button flex-1 ${seconds === String(value) ? 'bg-accent-500/20 text-accent-300' : 'bg-white/5'}`}>{value}s</button>)}
          </div>
          <p className="text-xs text-zinc-500">Duração personalizada em segundos, de 1s até 24h.</p>
          <button disabled={!validTarget || !validSeconds || running} className="touch-button w-full accent-solid disabled:opacity-40">Salvar tiros</button>
          <button type="button" onClick={() => setEditing(false)} className="touch-button w-full bg-white/5">Cancelar</button>
          {intervals && <button type="button" onClick={requestRemoval} className="touch-button w-full bg-white/5 text-zinc-300">Remover tiros</button>}
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
              {!running && <button type="button" onClick={startCardioInterval} className="touch-button accent-solid">Iniciar tiro</button>}
              <button type="button" onClick={markCardioInterval} className="touch-button bg-white/10">Marcar tiro</button>
              {running && <button type="button" onClick={cancelCardioInterval} className="touch-button bg-white/5">Cancelar tiro</button>}
              {running && <button type="button" onClick={requestRemoval} className="touch-button bg-white/5">Treino contínuo</button>}
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
    {editing && editingNumber && <SetNumericKeypad title="Configurar tiros" mode="integer"
      label={editingNumber === 'target' ? 'Quantidade' : 'Duração'} unit={editingNumber === 'seconds' ? 's' : undefined}
      value={editingNumber === 'target' ? target : seconds} onCancel={() => setEditingNumber(null)}
      onConfirm={(value) => {
        if (editingNumber === 'target') setTarget(value);
        else setSeconds(value);
        setEditingNumber(null);
      }} />}
    <ConfirmDialog open={confirmRemoval} title="Remover planejamento de tiros?"
      description="Os tiros registrados nesta sessão serão descartados, mas o treino continuará como atividade contínua."
      cancelLabel="Manter tiros" confirmLabel="Remover tiros" destructive
      onCancel={() => setConfirmRemoval(false)} onConfirm={removePlan} />
    </>
  );
};
