import { useEffect, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';

export const useLocalStorageState = <T,>(
  getInitialValue: () => T,
  onChange: (value: T) => void,
): readonly [T, Dispatch<SetStateAction<T>>] => {
  const [value, setValue] = useState<T>(getInitialValue);

  useEffect(() => {
    onChange(value);
  }, [onChange, value]);

  return [value, setValue] as const;
};
