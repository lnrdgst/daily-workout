import { useEffect, useState } from 'react';

const getElapsedSeconds = (startedAt: string) => Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));

export const formatWorkoutDuration = (seconds: number) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60)
    .toString()
    .padStart(2, '0');
  const remainder = (seconds % 60).toString().padStart(2, '0');

  return hours > 0 ? `${hours}:${minutes}:${remainder}` : `${minutes}:${remainder}`;
};

export const useWorkoutDuration = (startedAt?: string) => {
  const [elapsedSeconds, setElapsedSeconds] = useState(() => (startedAt ? getElapsedSeconds(startedAt) : 0));

  useEffect(() => {
    if (!startedAt) {
      setElapsedSeconds(0);
      return;
    }

    const updateDuration = () => setElapsedSeconds(getElapsedSeconds(startedAt));
    updateDuration();
    const intervalId = window.setInterval(updateDuration, 1000);

    return () => window.clearInterval(intervalId);
  }, [startedAt]);

  return formatWorkoutDuration(elapsedSeconds);
};
