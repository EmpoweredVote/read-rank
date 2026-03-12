import { useState, useEffect } from 'react';

const API_BASE = (import.meta.env as Record<string, string>).VITE_API_URL
  || 'https://api.empowered.vote';

export interface AuthState {
  isLoggedIn: boolean;
  loading: boolean;
}

export function useAuthState(): AuthState {
  const [state, setState] = useState<AuthState>({ isLoggedIn: false, loading: true });

  useEffect(() => {
    fetch(`${API_BASE}/auth/me`, { credentials: 'include' })
      .then(res => setState({ isLoggedIn: res.ok, loading: false }))
      .catch(() => setState({ isLoggedIn: false, loading: false }));
  }, []);

  return state;
}
