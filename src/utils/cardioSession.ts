import { cardioModalities } from '@/data/cardio';
import type { CardioModality, CardioSessionDraft, CardioSessionHistory } from '@/types/workout';

export const createCardioDraft = (modality: CardioModality): CardioSessionDraft => ({
  type: 'cardio', modality, startedAt: new Date().toISOString(), intervalEndAt: null,
});

export const isShortCardioSession = (draft: Pick<CardioSessionDraft, 'startedAt'>, now = Date.now()): boolean =>
  now - new Date(draft.startedAt).getTime() < 60000;

export const removeIntervals = (draft: CardioSessionDraft): CardioSessionDraft => {
  const next = { ...draft, intervalEndAt: null };
  delete next.intervals;
  return next;
};

export const configureIntervals = (draft: CardioSessionDraft, targetCount: number, durationSeconds: number): CardioSessionDraft => {
  if (draft.intervalEndAt !== null || !Number.isSafeInteger(targetCount) || targetCount < 1 ||
      !Number.isSafeInteger(durationSeconds) || durationSeconds < 1 || durationSeconds > 86400 ||
      targetCount < (draft.intervals?.completedCount ?? 0)) return draft;
  return { ...draft, intervals: { targetCount, durationSeconds, completedCount: draft.intervals?.completedCount ?? 0 } };
};

export const startInterval = (draft: CardioSessionDraft, now = Date.now()): CardioSessionDraft => {
  if (!draft.intervals || draft.intervalEndAt !== null || draft.intervals.completedCount >= draft.intervals.targetCount) return draft;
  return { ...draft, intervalEndAt: now + draft.intervals.durationSeconds * 1000 };
};

export const markInterval = (draft: CardioSessionDraft): CardioSessionDraft => {
  if (!draft.intervals || draft.intervals.completedCount >= draft.intervals.targetCount) return draft;
  return { ...draft, intervalEndAt: null, intervals: { ...draft.intervals, completedCount: draft.intervals.completedCount + 1 } };
};

export const settleInterval = (draft: CardioSessionDraft, now = Date.now()): CardioSessionDraft =>
  draft.intervalEndAt !== null && now >= draft.intervalEndAt ? markInterval(draft) : draft;

export const undoInterval = (draft: CardioSessionDraft): CardioSessionDraft => {
  if (!draft.intervals || draft.intervalEndAt !== null || draft.intervals.completedCount === 0) return draft;
  return { ...draft, intervals: { ...draft.intervals, completedCount: draft.intervals.completedCount - 1 } };
};

export const buildCardioHistoryEntry = (draft: CardioSessionDraft, now = Date.now()): CardioSessionHistory => {
  const settled = settleInterval(draft, now);
  return {
    type: 'cardio', id: `cardio-${draft.modality}-${now}`, modality: draft.modality,
    workoutName: cardioModalities[draft.modality], startedAt: draft.startedAt, finishedAt: new Date(now).toISOString(),
    distanceKm: draft.distanceKm, averageSpeedKmH: draft.averageSpeedKmH, resistance: draft.resistance,
    notes: draft.notes, intervals: settled.intervals,
  };
};
