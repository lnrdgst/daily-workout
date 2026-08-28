import { Play, RotateCcw, Square } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useWorkoutStore } from '@/hooks/useWorkoutStore';

const presets = [60, 90, 120] as const;

const formatTime = (seconds: number) => {
  const minutes = Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0');
  const remainder = (seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${remainder}`;
};

export const RestTimer = () => {
  const { state, startRestTimer, stopRestTimer, selectRestTimerPreset } = useWorkoutStore();
  const { restTimer } = state;
  const [now, setNow] = useState(Date.now());
  const isRunning = restTimer.status === 'running';
  const remainingSeconds =
    isRunning && restTimer.endAt !== null ? Math.max(0, Math.ceil((restTimer.endAt - now) / 1000)) : restTimer.status === 'finished' ? 0 : restTimer.selectedSeconds;

  useEffect(() => {
    if (!isRunning) {
      return;
    }

    setNow(Date.now());
    const intervalId = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(intervalId);
  }, [isRunning, restTimer.endAt]);

  const selectPreset = (seconds: (typeof presets)[number]) => {
    if (isRunning) {
      return;
    }

    selectRestTimerPreset(seconds);
  };

  const handlePrimaryAction = () => {
    if (isRunning) {
      stopRestTimer();
      return;
    }

    startRestTimer(restTimer.selectedSeconds);
  };

  const primaryAction =
    isRunning
      ? { label: 'Parar descanso', icon: <Square size={16} fill="currentColor" />, className: 'bg-white/15 text-zinc-100' }
      : restTimer.status === 'finished'
        ? { label: 'Repetir descanso', icon: <RotateCcw size={18} />, className: 'bg-white/10 text-accent-300' }
        : { label: 'Iniciar descanso', icon: <Play size={18} fill="currentColor" />, className: 'bg-accent-500 text-white' };

  return (
    <aside className="fixed bottom-[env(safe-area-inset-bottom)] left-1/2 z-30 w-[calc(100%-1rem)] max-w-md -translate-x-1/2 rounded-2xl border border-white/10 bg-surface-900/95 p-2 shadow-glow backdrop-blur">
      <div className="flex items-center gap-2">
        <p className="w-[4.25rem] shrink-0 text-center text-xl font-bold tabular-nums text-accent-300">{formatTime(remainingSeconds)}</p>

        <div className="grid min-w-0 flex-1 grid-cols-3 gap-1">
          {presets.map((seconds) => (
            <button
              key={seconds}
              type="button"
              disabled={isRunning}
              onClick={() => selectPreset(seconds)}
              className={`min-h-10 rounded-xl px-1 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${
                restTimer.selectedSeconds === seconds ? 'bg-accent-500/20 text-accent-300' : 'bg-white/5 text-zinc-300'
              }`}
            >
              {seconds}s
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={handlePrimaryAction}
          aria-label={primaryAction.label}
          className={`inline-flex min-h-10 w-10 shrink-0 items-center justify-center rounded-xl transition active:scale-[0.98] ${primaryAction.className}`}
        >
          {primaryAction.icon}
        </button>
      </div>
    </aside>
  );
};
