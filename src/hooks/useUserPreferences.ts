import { useState } from 'react';
import { loadUserPreferences, saveUserPreferences } from '@/utils/userPreferences';

export const useUserPreferences = () => {
  const [preferences, setPreferences] = useState(loadUserPreferences);

  const savePreferences = (nextPreferences: typeof preferences) => {
    const normalizedPreferences = { displayName: nextPreferences.displayName.trim() };
    saveUserPreferences(normalizedPreferences);
    setPreferences(normalizedPreferences);
  };

  return [preferences, savePreferences] as const;
};
