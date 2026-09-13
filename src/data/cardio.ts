import type { CardioModality } from '@/types/workout';

export const cardioModalities: Record<CardioModality, string> = {
  'stationary-bike': 'Bike ergométrica',
  spinning: 'Spinning',
  running: 'Corrida',
  walking: 'Caminhada',
  'outdoor-bike': 'Bike ao ar livre',
};

export const isCardioModality = (value: string | undefined): value is CardioModality =>
  value !== undefined && Object.prototype.hasOwnProperty.call(cardioModalities, value);
