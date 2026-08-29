import { useEffect, useState } from 'react';

const KEYBOARD_OFFSET_THRESHOLD_PX = 100;

export const useVisualViewportKeyboardOffset = () => {
  const [keyboardOffset, setKeyboardOffset] = useState(0);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport || !window.matchMedia('(pointer: coarse)').matches) {
      return;
    }

    const updateKeyboardOffset = () => {
      const offset = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
      const nextOffset = offset >= KEYBOARD_OFFSET_THRESHOLD_PX ? Math.round(offset) : 0;
      setKeyboardOffset((currentOffset) => (currentOffset === nextOffset ? currentOffset : nextOffset));
    };

    updateKeyboardOffset();
    viewport.addEventListener('resize', updateKeyboardOffset);
    viewport.addEventListener('scroll', updateKeyboardOffset);

    return () => {
      viewport.removeEventListener('resize', updateKeyboardOffset);
      viewport.removeEventListener('scroll', updateKeyboardOffset);
    };
  }, []);

  return keyboardOffset;
};
