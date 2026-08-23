import { useEffect, useRef, useState } from 'react';

const presets = [60, 90, 120, 180];

const formatTime = (seconds: number) => {
  const minutes = Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0');
  const remainder = (seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${remainder}`;
};

export const RestTimer = () => {
  const [remainingSeconds, setRemainingSeconds] = useState(90);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isRunning) {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = window.setInterval(() => {
      setRemainingSeconds((current) => {
        if (current <= 1) {
          setIsRunning(false);
          return 0;
        }

        return current - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
      }
    };
  }, [isRunning]);

  return (
    <section className="panel p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">Descanso</p>
          <h2 className="mt-1 text-lg font-bold">Cronômetro</h2>
        </div>
        <div className="rounded-3xl bg-accent-500/10 px-5 py-3 text-4xl font-bold text-accent-300">
          {formatTime(remainingSeconds)}
        </div>
      </div>

      <div className="mb-4 grid grid-cols-4 gap-2">
        {presets.map((seconds) => (
          <button
            key={seconds}
            type="button"
            onClick={() => {
              setRemainingSeconds(seconds);
              setIsRunning(false);
            }}
            className="touch-button bg-white/5 text-zinc-200"
          >
            {seconds}s
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => setIsRunning(true)}
          className="touch-button bg-accent-500 font-semibold text-white"
        >
          Iniciar
        </button>
        <button
          type="button"
          onClick={() => setIsRunning(false)}
          className="touch-button bg-white/10 text-zinc-100"
        >
          Pausar
        </button>
        <button
          type="button"
          onClick={() => {
            setIsRunning(false);
            setRemainingSeconds(0);
          }}
          className="touch-button bg-danger/90 text-white"
        >
          Zerar
        </button>
      </div>
    </section>
  );
};
