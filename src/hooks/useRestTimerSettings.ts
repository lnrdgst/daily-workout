import { useLocalStorageState } from '@/hooks/useLocalStorageState';
import { loadRestTimerSettings, saveRestTimerSettings } from '@/utils/restTimerSettings';

export const useRestTimerSettings = () => useLocalStorageState(loadRestTimerSettings, saveRestTimerSettings);
