import { useState, useEffect } from 'react';
import { extractHashToken, getToken, setToken, apiFetch, clearToken, API_HUB_URL } from '../lib/auth';

export interface AuthState {
  isLoggedIn: boolean;
  userName: string | null;
  loading: boolean;
}

async function loadProfile(setState: (s: AuthState) => void) {
  apiFetch('/account/me')
    .then(async res => {
      if (res && res.ok) {
        const data = await res.json();
        setState({ isLoggedIn: true, userName: data.display_name ?? null, loading: false });
      } else if (res) {
        setState({ isLoggedIn: false, userName: null, loading: false });
      }
    })
    .catch(() => setState({ isLoggedIn: false, userName: null, loading: false }));
}

export function useAuthState(): AuthState & { logout: () => Promise<void> } {
  const [state, setState] = useState<AuthState>({ isLoggedIn: false, userName: null, loading: true });

  useEffect(() => {
    // Extract token from hash fragment first (Auth Hub redirect)
    extractHashToken();

    const token = getToken();
    if (token) {
      loadProfile(setState);
      return;
    }

    // No local token — try silent SSO via accounts.empowered.vote session cookie
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    fetch(`${API_HUB_URL}/api/auth/session`, {
      credentials: 'include',
      signal: controller.signal,
    })
      .then(async res => {
        clearTimeout(timeout);
        if (res.ok) {
          const { access_token } = await res.json();
          setToken(access_token);
          loadProfile(setState);
        } else {
          setState({ isLoggedIn: false, userName: null, loading: false });
        }
      })
      .catch(err => {
        clearTimeout(timeout);
        if (err.name !== 'AbortError') console.warn('[SSO]', err);
        setState({ isLoggedIn: false, userName: null, loading: false });
      });
  }, []);

  const logout = async () => {
    const token = getToken();
    try {
      await fetch(`${API_HUB_URL}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
    } catch (err) {
      console.error('Logout error:', err);
    }
    clearToken();
    setState({ isLoggedIn: false, userName: null, loading: false });
  };

  return { ...state, logout };
}
