import { createContext, useContext } from 'react';

// Kept apart from ThemeProvider.tsx so that file exports only a component
// (React Fast Refresh needs component-only modules to hot-reload them).

interface ThemeContextValue {
  isDark: boolean;
  toggle: () => void;
}

export const ThemeContext = createContext<ThemeContextValue>({ isDark: true, toggle: () => {} });

export function useTheme() {
  return useContext(ThemeContext);
}
