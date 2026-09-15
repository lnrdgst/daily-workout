import { createContext } from 'react';

// A global recovery flow temporarily hides page dialogs without mutating their state.
export const DialogSuppressionContext = createContext(false);
