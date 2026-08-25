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

const TOKEN_KEY    = 'fil_access_token';
const USER_KEY     = 'fil_auth_user';

// Module-level reference — always current, no closure staleness
let _memToken: string | null = localStorage.getItem(TOKEN_KEY);

export function getMemToken(): string | null { return _memToken; }
export function setMemToken(t: string | null) {
  _memToken = t;
  if (t) localStorage.setItem(TOKEN_KEY, t);
  else    localStorage.removeItem(TOKEN_KEY);
}

function getCachedUser(): AuthUser | null {
  try { return JSON.parse(localStorage.getItem(USER_KEY) || 'null'); } catch { return null; }
}
function setCachedUser(u: AuthUser | null) {
  if (u) localStorage.setItem(USER_KEY, JSON.stringify(u));
  else    localStorage.removeItem(USER_KEY);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]               = useState<AuthUser | null>(getCachedUser);
  const [accessToken, setAccessToken] = useState<string | null>(_memToken);
  const [isLoading, setIsLoading]     = useState(!_memToken); // skip spinner if token already in LS

  const applySession = useCallback((token: string, userData: AuthUser) => {
    setMemToken(token);
    setAccessToken(token);
    setUser(userData);
    setCachedUser(userData);
  }, []);

  const clearSession = useCallback(() => {
    setMemToken(null);
    setAccessToken(null);
    setUser(null);
    setCachedUser(null);
  }, []);

  const fetchMe = useCallback(async (token: string): Promise<AuthUser> => {
    const res = await fetch('/auth/me', { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) {
      // Only clear session on explicit 401 from backend
      if (res.status === 401) throw new Error('401');
      throw new Error('me failed');
    }
    return res.json();
  }, []);

  // Silently refresh token — never redirect unless backend says 401
  const silentRefresh = useCallback(async (): Promise<boolean> => {
    // If we have a stored token, validate it first before trying refresh
    const storedToken = localStorage.getItem(TOKEN_KEY);
    if (storedToken) {
      try {
        const userData = await fetchMe(storedToken);
        applySession(storedToken, userData);
        return true;
      } catch (err: any) {
        if (err?.message !== '401') {
          // Network error or non-401 — keep existing session, don't log out
          const cachedUser = getCachedUser();
          if (cachedUser) {
            setUser(cachedUser);
            setAccessToken(storedToken);
            return true;
          }
        }
        // 401 → try refresh token cookie
      }
    }

    try {
      const res = await fetch('/auth/refresh', { method: 'POST', credentials: 'include' });
      if (!res.ok) throw new Error('refresh failed');
      const { access_token } = await res.json();
      const userData = await fetchMe(access_token);
      applySession(access_token, userData);
      return true;
    } catch {
      // Network error — keep cached user so we don't flash login screen
      const cached = getCachedUser();
      if (cached) {
        setUser(cached);
        // Keep whatever token we have, or null
        return true;
      }
      // No cache + no refresh → must re-login
      clearSession();
      return false;
    }
  }, [applySession, clearSession, fetchMe]);

  useEffect(() => {
    const hash = window.location.hash;
    const params = new URLSearchParams(hash.slice(1));
    const fragmentToken = params.get('access_token');

    if (fragmentToken) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
      fetchMe(fragmentToken)
        .then(u => applySession(fragmentToken, u))
        .catch(clearSession)
        .finally(() => setIsLoading(false));
    } else {
      silentRefresh().finally(() => setIsLoading(false));
    }
  }, []); // eslint-disable-line

  // Refresh token 2 minutes before expiry (access token is 15 min)
  useEffect(() => {
    if (!accessToken) return;
    const interval = setInterval(() => {
      silentRefresh();
    }, 13 * 60 * 1000); // 13 minutes
    return () => clearInterval(interval);
  }, [accessToken, silentRefresh]);

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
