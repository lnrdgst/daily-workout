import { cardioModalities } from '@/data/cardio';
import type { ActiveSession, SessionHistory, WorkoutSessionHistory } from '@/types/workout';
import { getDraftWorkoutName } from '@/utils/workoutDraft';

export const isStrengthHistory = (session: SessionHistory): session is WorkoutSessionHistory => session.type !== 'cardio';
export const getLatestSession = (history: SessionHistory[]): SessionHistory | null =>
  history.reduce<SessionHistory | null>((latest, session) =>
    !latest || new Date(session.finishedAt).getTime() > new Date(latest.finishedAt).getTime() ? session : latest, null);
export const getSessionName = (session: ActiveSession) =>
  session.type === 'cardio' ? cardioModalities[session.modality] : getDraftWorkoutName(session);
export const getSessionPath = (session: ActiveSession) =>
  session.type === 'cardio' ? `/cardio/${session.modality}` : `/workout/${session.workoutId}`;
