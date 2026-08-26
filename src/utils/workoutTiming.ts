const isValidDate = (date: Date) => !Number.isNaN(date.getTime());

const formatWorkoutDuration = (durationInMinutes: number) => {
  const hours = Math.floor(durationInMinutes / 60);
  const minutes = durationInMinutes % 60;

  if (hours === 0) {
    return `${minutes} min`;
  }

  return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}min`;
};

export const formatWorkoutTimeRange = (startedAt?: string, finishedAt?: string) => {
  if (!startedAt || !finishedAt) {
    return null;
  }

  const start = new Date(startedAt);
  const finish = new Date(finishedAt);

  if (!isValidDate(start) || !isValidDate(finish) || finish < start) {
    return null;
  }

  const durationInMinutes = Math.floor((finish.getTime() - start.getTime()) / 60_000);
  const timeFormat: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' };

  return `${start.toLocaleTimeString('pt-BR', timeFormat)} → ${finish.toLocaleTimeString('pt-BR', timeFormat)} · ${formatWorkoutDuration(durationInMinutes)}`;
};
