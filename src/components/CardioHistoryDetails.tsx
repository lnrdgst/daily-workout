import type { CardioSessionHistory } from '@/types/workout';

export const CardioHistoryDetails = ({ session }: { session: CardioSessionHistory }) => {
  if (session.distanceKm === undefined && session.averageSpeedKmH === undefined && session.resistance === undefined &&
      !session.intervals && !session.notes?.trim()) return null;
  return (
  <dl className="space-y-3 rounded-2xl border border-white/10 bg-black/20 p-3 text-sm">
    {session.distanceKm !== undefined && <div><dt className="text-zinc-500">Distância</dt><dd>{session.distanceKm.toLocaleString('pt-BR')} km</dd></div>}
    {session.averageSpeedKmH !== undefined && <div><dt className="text-zinc-500">Velocidade média</dt><dd>{session.averageSpeedKmH.toLocaleString('pt-BR')} km/h</dd></div>}
    {session.resistance !== undefined && <div><dt className="text-zinc-500">Resistência</dt><dd>{session.resistance.toLocaleString('pt-BR')}</dd></div>}
    {session.intervals && <div><dt className="text-zinc-500">Tiros</dt><dd>{session.intervals.targetCount} tiros de {session.intervals.durationSeconds}s · {session.intervals.completedCount} concluídos</dd></div>}
    {session.notes?.trim() && <div><dt className="text-zinc-500">Observações</dt><dd className="whitespace-pre-wrap break-words">{session.notes}</dd></div>}
  </dl>
  );
};
