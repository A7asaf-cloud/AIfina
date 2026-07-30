import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string;
  isVerified: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  applySession: (token: string, user: AuthUser) => void;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);
const CACHE_KEY = 'fil_auth_user';

// In-memory token (not persisted — security: not in localStorage)
let _memToken: string | null = null;
export function setMemToken(t: string | null) { _memToken = t; }
export function getMemToken(): string | null   { return _memToken; }

function getCachedUser(): AuthUser | null {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) || 'null'); } catch { return null; }
}
function setCachedUser(u: AuthUser | null) {
  if (u) localStorage.setItem(CACHE_KEY, JSON.stringify(u));
  else localStorage.removeItem(CACHE_KEY);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // Start with cached user immediately — no loading flash on refresh
  const [user, setUser]               = useState<AuthUser | null>(getCachedUser);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  // isLoading = true only while we're validating the cached session in background
  const [isLoading, setIsLoading]     = useState(true);

  const applySession = useCallback((token: string, userData: AuthUser) => {
    _memToken = token;
    setAccessToken(token);
    setUser(userData);
    setCachedUser(userData);
  }, []);

  const clearSession = useCallback(() => {
    _memToken = null;
    setAccessToken(null);
    setUser(null);
    setCachedUser(null);
  }, []);

  const fetchMe = useCallback(async (token: string): Promise<AuthUser> => {
    const res = await fetch('/auth/me', { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error('me failed');
    return res.json();
  }, []);

  const silentRefresh = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch('/auth/refresh', { method: 'POST', credentials: 'include' });
      if (!res.ok) throw new Error('refresh failed');
      const { access_token } = await res.json();
      const userData = await fetchMe(access_token);
      applySession(access_token, userData);
      return true;
    } catch {
      // Only clear if we had no cached user — avoid flash-of-logout
      clearSession();
      return false;
    }
  }, [applySession, clearSession, fetchMe]);

  useEffect(() => {
    const hash = window.location.hash;
    const params = new URLSearchParams(hash.slice(1));
    const fragmentToken = params.get('access_token');

    if (fragmentToken) {
      // Google OAuth callback
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
      fetchMe(fragmentToken)
        .then(u => applySession(fragmentToken, u))
        .catch(clearSession)
        .finally(() => setIsLoading(false));
    } else {
      // Silent refresh in background — UI already shows from cache
      silentRefresh().finally(() => setIsLoading(false));
    }
  }, []); // eslint-disable-line

  const logout = useCallback(async () => {
    try {
      await fetch('/auth/logout', {
        method: 'POST', credentials: 'include',
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      });
    } catch {}
    clearSession();
  }, [accessToken, clearSession]);

  const logoutAll = useCallback(async () => {
    try {
      await fetch('/auth/logout-all', {
        method: 'POST', credentials: 'include',
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      });
    } catch {}
    clearSession();
  }, [accessToken, clearSession]);

  return (
    <AuthContext.Provider value={{
      user, accessToken, isAuthenticated: !!user, isLoading,
      applySession, logout, logoutAll,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
