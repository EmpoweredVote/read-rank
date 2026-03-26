export const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL.replace(/\/+$/, '')}/api`
  : '/api';

export const TOKEN_KEY = 'ev_token';
export const AUTH_HUB_URL = 'https://accounts.empowered.vote';
export const API_HUB_URL = 'https://accounts-api.empowered.vote';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function extractHashToken(): string | null {
  const hash = window.location.hash;
  if (!hash.includes('access_token=')) return null;
  const params = new URLSearchParams(hash.substring(1));
  const token = params.get('access_token');
  if (!token) return null;
  window.history.replaceState(null, '', window.location.pathname + window.location.search);
  setToken(token);
  return token;
}

export function redirectToLogin(returnUrl: string = window.location.href): void {
  window.location.href = `${AUTH_HUB_URL}/login?redirect=${encodeURIComponent(returnUrl)}`;
}

export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response | null> {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers as Record<string, string> || {}),
    },
  });

  if (res.status === 401) {
    clearToken();
    redirectToLogin();
    return null;
  }

  return res;
}
