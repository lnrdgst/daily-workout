import { useLocalStorageState } from '@/hooks/useLocalStorageState';
import { loadRestAlertSettings, saveRestAlertSettings } from '@/utils/restAlertSettings';

export const useRestAlertSettings = () => useLocalStorageState(loadRestAlertSettings, saveRestAlertSettings);
