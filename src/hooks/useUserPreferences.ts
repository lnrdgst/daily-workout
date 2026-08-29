import { useLocalStorageState } from './useLocalStorageState';
import { loadUserPreferences, saveUserPreferences } from '@/utils/userPreferences';

export const useUserPreferences = () => useLocalStorageState(loadUserPreferences, saveUserPreferences);
