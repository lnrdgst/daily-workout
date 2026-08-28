import { Play, RotateCcw, Square } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useRestAlertSettings } from '@/hooks/useRestAlertSettings';
import { primeRestAlertSound, triggerRestFinishedAlerts } from '@/utils/restAlerts';
import type { RestDurationSeconds } from '@/utils/restTimerSettings';

const presets = [60, 90, 120];

const formatTime = (seconds: number) => {
  const minutes = Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0');
  const remainder = (seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${remainder}`;
};

type RestTimerStatus = 'ready' | 'running' | 'finished';

interface RestTimerProps {
  autoStartRequest?: {
    id: number;
    seconds: RestDurationSeconds;
  } | null;
}

export const RestTimer = ({ autoStartRequest = null }: RestTimerProps) => {
  const [settings] = useRestAlertSettings();
  const [selectedSeconds, setSelectedSeconds] = useState(90);
  const [remainingSeconds, setRemainingSeconds] = useState(90);
  const [status, setStatus] = useState<RestTimerStatus>('ready');
  const intervalRef = useRef<number | null>(null);
  const endAtRef = useRef<number | null>(null);
  const hasAlertedRef = useRef(false);
  const soundEnabledRef = useRef(settings.sound);
  const isRunning = status === 'running';
  const autoStartRequestId = autoStartRequest?.id ?? null;
  const autoStartSeconds = autoStartRequest?.seconds ?? null;

  useEffect(() => {
    soundEnabledRef.current = settings.sound;
  }, [settings.sound]);

  useEffect(() => {
    if (!isRunning) {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const updateRemainingTime = () => {
      const endAt = endAtRef.current;
      if (!endAt) {
        return;
      }

      const nextRemainingSeconds = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
      setRemainingSeconds(nextRemainingSeconds);

      if (nextRemainingSeconds === 0) {
        endAtRef.current = null;
        setStatus('finished');
        if (!hasAlertedRef.current) {
          hasAlertedRef.current = true;
          triggerRestFinishedAlerts(settings);
        }
      }
    };

    updateRemainingTime();
    intervalRef.current = window.setInterval(updateRemainingTime, 1000);

    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning, settings]);

  const startTimer = (seconds = selectedSeconds) => {
    hasAlertedRef.current = false;
    endAtRef.current = Date.now() + seconds * 1000;
    setSelectedSeconds(seconds);
    setRemainingSeconds(seconds);
    setStatus('running');
    if (soundEnabledRef.current) {
      primeRestAlertSound();
    }
  };

  useEffect(() => {
    if (autoStartRequestId === null || autoStartSeconds === null) {
      return;
    }

    hasAlertedRef.current = false;
    endAtRef.current = Date.now() + autoStartSeconds * 1000;
    setSelectedSeconds(autoStartSeconds);
    setRemainingSeconds(autoStartSeconds);
    setStatus('running');
    if (soundEnabledRef.current) {
      primeRestAlertSound();
    }
  }, [autoStartRequestId, autoStartSeconds]);

  const selectPreset = (seconds: number) => {
    if (isRunning) {
      return;
    }

    endAtRef.current = null;
    setSelectedSeconds(seconds);
    setRemainingSeconds(seconds);
    setStatus('ready');
  };

  const handlePrimaryAction = () => {
    if (status === 'running') {
      endAtRef.current = null;
      setRemainingSeconds(selectedSeconds);
      setStatus('ready');
      return;
    }

    startTimer();
  };

  const primaryAction =
    status === 'running'
      ? { label: 'Parar descanso', icon: <Square size={16} fill="currentColor" />, className: 'bg-white/15 text-zinc-100' }
      : status === 'finished'
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
                selectedSeconds === seconds ? 'bg-accent-500/20 text-accent-300' : 'bg-white/5 text-zinc-300'
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
