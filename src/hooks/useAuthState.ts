import { useState, useEffect } from 'react';
import { extractHashToken, getToken, apiFetch, clearToken } from '../lib/auth';

export interface AuthState {
  isLoggedIn: boolean;
  userName: string | null;
  loading: boolean;
}

export function useAuthState(): AuthState & { logout: () => Promise<void> } {
  const [state, setState] = useState<AuthState>({ isLoggedIn: false, userName: null, loading: true });

  useEffect(() => {
    // Extract token from hash fragment first (Auth Hub redirect)
    extractHashToken();

    const token = getToken();
    if (!token) {
      setState({ isLoggedIn: false, userName: null, loading: false });
      return;
    }

    apiFetch('/account/me')
      .then(async res => {
        if (res && res.ok) {
          const data = await res.json();
          setState({ isLoggedIn: true, userName: data.display_name ?? null, loading: false });
        } else if (res) {
          setState({ isLoggedIn: false, userName: null, loading: false });
        }
        // If res is null, apiFetch already redirected (401)
      })
      .catch(() => setState({ isLoggedIn: false, userName: null, loading: false }));
  }, []);

  const logout = async () => {
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('Logout error:', err);
    }
    clearToken();
    setState({ isLoggedIn: false, userName: null, loading: false });
  };

  return { ...state, logout };
}
