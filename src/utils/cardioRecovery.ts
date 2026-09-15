import type { CardioSessionDraft, CardioSessionHistory } from '@/types/workout';
import { buildCardioHistoryEntry } from '@/utils/cardioSession';
import { isStaleSession } from '@/utils/staleSession';

export interface CardioRecoveryInput {
  modality: CardioSessionDraft['modality'];
  startedAt: string;
  hours: number;
  minutes: number;
}

export const validateCardioRecovery = (startedAt: string, hours: number, minutes: number, now = Date.now()) => {
  const start = new Date(startedAt).getTime();
  if (!Number.isSafeInteger(hours) || hours < 0 || !Number.isSafeInteger(minutes) || minutes < 0 || minutes > 59) {
    return { error: 'Informe horas inteiras e minutos de 0 a 59.' };
  }
  const totalMinutes = hours * 60 + minutes;
  if (totalMinutes < 1) return { error: 'Informe pelo menos 1 minuto.' };
  if (!Number.isFinite(start) || !Number.isFinite(now) || !Number.isSafeInteger(totalMinutes) || totalMinutes > Math.floor((now - start) / 60000)) {
    return { error: 'A duração não pode superar o tempo desde o início.' };
  }
  return { finishedAt: start + totalMinutes * 60000 };
};

export const buildRecoveredCardioHistoryEntry = (
  draft: CardioSessionDraft, input: CardioRecoveryInput, now = Date.now(),
): CardioSessionHistory | null => {
  if (input.startedAt !== draft.startedAt || input.modality !== draft.modality || !isStaleSession(draft.startedAt, now)) return null;
  const result = validateCardioRecovery(draft.startedAt, input.hours, input.minutes, now);
  if (result.finishedAt === undefined) return null;
  // Settle against the real clock, preserving the same count regardless of whether
  // the provider's overdue callback ran before recovery. Never infer duration from shots.
  return { ...buildCardioHistoryEntry(draft, now), finishedAt: new Date(result.finishedAt).toISOString(), completionSource: 'stale-recovery' };
};
