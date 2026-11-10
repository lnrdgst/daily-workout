import type { CardioModality, TreadmillActivity } from '@/types/workout';

export const cardioModalities: Record<CardioModality, string> = {
  'stationary-bike': 'Bike ergométrica',
  spinning: 'Spinning',
  running: 'Corrida',
  walking: 'Caminhada',
  'outdoor-bike': 'Bike ao ar livre',
  treadmill: 'Esteira',
};

export const treadmillActivities: Record<TreadmillActivity, string> = {
  walking: 'Caminhada',
  running: 'Corrida',
  mixed: 'Caminhada e corrida',
};

export const isTreadmillActivity = (value: string): value is TreadmillActivity =>
  Object.prototype.hasOwnProperty.call(treadmillActivities, value);

export const isCardioModality = (value: string | undefined): value is CardioModality =>
  value !== undefined && Object.prototype.hasOwnProperty.call(cardioModalities, value);
