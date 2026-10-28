import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

interface ThemeContextValue {
  isDark: boolean;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({ isDark: true, toggle: () => {} });
const KEY = 'ev:color-scheme';
const COOKIE_NAME = 'ev_theme';

// The cookie is how a choice reaches the other .empowered.vote apps. This app read it but
// never wrote it, so the trip was one-way: a toggle here stayed here, and the next load was
// overridden by whatever cookie another app had left, because the cookie outranks our own
// localStorage in resolveInitialTheme above.
//
// ⚠ On localhost the browser rejects a .empowered.vote cookie, so in dev only the localStorage
// half takes effect and the theme will not follow you between apps. Expected, not a bug.
function setCrossAppCookie(value: 'dark' | 'light') {
  const expires = new Date();
  expires.setFullYear(expires.getFullYear() + 1);
  document.cookie = `${COOKIE_NAME}=${value}; domain=.empowered.vote; path=/; expires=${expires.toUTCString()}; SameSite=Lax`;
}

function resolveInitialTheme(): boolean {
  // 1. ev_theme cookie (set by profile page on .empowered.vote — cross-subdomain priority)
  const cookie = document.cookie
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${COOKIE_NAME}=`));
  if (cookie) return cookie.split('=')[1] === 'dark';
  // 2. ev:color-scheme (ThemeProvider's canonical key)
  const stored = localStorage.getItem(KEY);
  if (stored === 'dark') return true;
  if (stored === 'light') return false;
  // 3. compass_dark_mode (CalibrationOverlay legacy key)
  const legacy = localStorage.getItem('compass_dark_mode');
  if (legacy !== null) return legacy === 'true';
  // 4. Dark. The OS is NOT consulted — a browser reports prefers-color-scheme: light when the
  //    OS has no preference set at all, so reading it could not tell "never chose" apart from
  //    "chose light", and every undecided visitor landed on a light page.
  return true;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState<boolean>(resolveInitialTheme);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  // There WAS a matchMedia listener here that followed the OS mid-session for a visitor with
  // nothing in localStorage. It went on 2026-10-27, with the OS fallback above: once dark
  // became the default for everyone undecided, this was the one path left that could still
  // move them to light without them asking. It could not see a cookie-borne choice either.

  function toggle() {
    setIsDark((prev) => {
      const next = !prev;
      const value = next ? 'dark' : 'light';
      setCrossAppCookie(value);
      try {
        localStorage.setItem(KEY, value);
      } catch {
        // Blocked or full storage. The cookie above already carries the choice.
      }
      return next;
    });
  }

  return <ThemeContext.Provider value={{ isDark, toggle }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
