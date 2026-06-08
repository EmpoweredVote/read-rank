import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

interface ThemeContextValue {
  isDark: boolean;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({ isDark: true, toggle: () => {} });
const KEY = 'ev:color-scheme';

function resolveInitialTheme(): boolean {
  // 1. ev_theme cookie (set by profile page on .empowered.vote — cross-subdomain priority)
  const cookie = document.cookie
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith('ev_theme='));
  if (cookie) return cookie.split('=')[1] === 'dark';
  // 2. ev:color-scheme (ThemeProvider's canonical key)
  const stored = localStorage.getItem(KEY);
  if (stored === 'dark') return true;
  if (stored === 'light') return false;
  // 3. compass_dark_mode (CalibrationOverlay legacy key)
  const legacy = localStorage.getItem('compass_dark_mode');
  if (legacy !== null) return legacy === 'true';
  // 4. OS preference
  return !window.matchMedia('(prefers-color-scheme: light)').matches;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState<boolean>(resolveInitialTheme);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const handleChange = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem(KEY)) setIsDark(!e.matches);
    };
    mq.addEventListener('change', handleChange);
    return () => mq.removeEventListener('change', handleChange);
  }, []);

  function toggle() {
    setIsDark((prev) => {
      const next = !prev;
      localStorage.setItem(KEY, next ? 'dark' : 'light');
      return next;
    });
  }

  return <ThemeContext.Provider value={{ isDark, toggle }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
