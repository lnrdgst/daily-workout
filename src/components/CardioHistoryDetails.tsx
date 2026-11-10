import { isTreadmillActivity, treadmillActivities } from '@/data/cardio';
import { formatSetNumber, numberToDecimalString } from '@/utils/setNumericEntry';
import type { CardioSessionHistory } from '@/types/workout';

const formatMetric = (value: number) => formatSetNumber(numberToDecimalString(value))
  .replace(/^-?\d+/, (whole) => whole.replace(/\B(?=(\d{3})+(?!\d))/g, '.'));

export const CardioHistoryDetails = ({ session }: { session: CardioSessionHistory }) => {
  const activity = session.modality === 'treadmill' && session.treadmillActivity && isTreadmillActivity(session.treadmillActivity)
    ? treadmillActivities[session.treadmillActivity] : null;
  if (!activity && session.distanceKm === undefined && session.averageSpeedKmH === undefined && session.resistance === undefined &&
      !session.intervals && !session.notes?.trim()) return null;
  return (
  <dl className="space-y-3 break-words rounded-2xl border border-white/10 bg-black/20 p-3 text-sm">
    {activity && <div><dt className="text-zinc-500">Tipo de atividade</dt><dd>{activity}</dd></div>}
    {session.distanceKm !== undefined && <div><dt className="text-zinc-500">Distância</dt><dd>{formatMetric(session.distanceKm)} km</dd></div>}
    {session.averageSpeedKmH !== undefined && <div><dt className="text-zinc-500">Velocidade média</dt><dd>{formatMetric(session.averageSpeedKmH)} km/h</dd></div>}
    {session.resistance !== undefined && <div><dt className="text-zinc-500">Resistência</dt><dd>{formatMetric(session.resistance)}</dd></div>}
    {session.intervals && <div><dt className="text-zinc-500">Tiros</dt><dd>{session.intervals.targetCount} tiros de {session.intervals.durationSeconds}s · {session.intervals.completedCount} concluídos</dd></div>}
    {session.notes?.trim() && <div><dt className="text-zinc-500">Observações</dt><dd className="whitespace-pre-wrap break-words">{session.notes}</dd></div>}
  </dl>
  );
};
