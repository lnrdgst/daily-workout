import { cardioModalities } from '@/data/cardio';
import { workoutsById } from '@/data/workouts';
import type { ActiveSession, SessionHistory, WorkoutSessionHistory } from '@/types/workout';

export const isStrengthHistory = (session: SessionHistory): session is WorkoutSessionHistory => session.type !== 'cardio';
export const getLatestSession = (history: SessionHistory[]): SessionHistory | null =>
  history.reduce<SessionHistory | null>((latest, session) =>
    !latest || new Date(session.finishedAt).getTime() > new Date(latest.finishedAt).getTime() ? session : latest, null);
export const getSessionName = (session: ActiveSession) =>
  session.type === 'cardio' ? cardioModalities[session.modality] : workoutsById[session.workoutId].name;
export const getSessionPath = (session: ActiveSession) =>
  session.type === 'cardio' ? `/cardio/${session.modality}` : `/workout/${session.workoutId}`;
