import { useState, useEffect } from 'react';

const API_BASE = (import.meta.env as Record<string, string>).VITE_API_URL
  || 'https://api.empowered.vote';

export interface AuthState {
  isLoggedIn: boolean;
  userName: string | null;
  loading: boolean;
}

export function useAuthState(): AuthState & { logout: () => Promise<void> } {
  const [state, setState] = useState<AuthState>({ isLoggedIn: false, userName: null, loading: true });

  useEffect(() => {
    fetch(`${API_BASE}/auth/me`, { credentials: 'include' })
      .then(async res => {
        if (res.ok) {
          const data = await res.json();
          setState({ isLoggedIn: true, userName: data.username ?? null, loading: false });
        } else {
          setState({ isLoggedIn: false, userName: null, loading: false });
        }
      })
      .catch(() => setState({ isLoggedIn: false, userName: null, loading: false }));
  }, []);

  const logout = async () => {
    try {
      await fetch(`${API_BASE}/auth/logout`, { method: 'POST', credentials: 'include' });
    } catch (err) {
      console.error('Logout error:', err);
    }
    setState({ isLoggedIn: false, userName: null, loading: false });
  };

  return { ...state, logout };
}
