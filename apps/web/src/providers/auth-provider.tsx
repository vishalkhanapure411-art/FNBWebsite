'use client';

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import {
  api,
  setAccessToken,
  setRefreshToken,
  getAccessToken as getStoredToken,
} from '@/lib/api-client';
import type { Role } from '@omniops/shared';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  permissions: Record<string, boolean>;
  tenantId: string | null;
  siteId: string | null;
  status: string;
}

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: Role) => boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  // Monotonic session version. `login()` bumps it; the mount-time `restoreSession`
  // captures it before its async round-trip and discards its result if a login
  // happened in the meantime — so an in-flight `/auth/me` can never clobber a
  // freshly logged-in user (or wipe tokens on a race-y 401) while the app is
  // navigating to /dashboard after a successful sign-in.
  const sessionVersionRef = useRef(0);

  // Restore session on mount
  useEffect(() => {
    const restoreSession = async () => {
      const versionAtStart = sessionVersionRef.current;
      const token = getStoredToken();
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await api.get<{ data: User }>('/auth/me');
        if (sessionVersionRef.current !== versionAtStart) return; // superseded by login()
        setUser(response.data ?? (response as unknown as User));
      } catch {
        // Token expired or invalid — clear it, unless a login happened meanwhile
        if (sessionVersionRef.current === versionAtStart) {
          setAccessToken(null);
          setRefreshToken(null);
          setUser(null);
        }
      } finally {
        if (sessionVersionRef.current === versionAtStart) {
          setIsLoading(false);
        }
      }
    };

    restoreSession();
  }, []);

  const login = useCallback(
    async (email: string, password: string, rememberMe = false) => {
      sessionVersionRef.current += 1;
      const response = await api.post<{
        accessToken: string;
        refreshToken: string;
        user: User;
      }>('/auth/login', { email, password, rememberMe });

      setAccessToken(response.accessToken);
      setRefreshToken(response.refreshToken);
      setUser(response.user);
      // A successful login establishes the session — clear the loading flag even
      // if the mount-time restore is still in flight (it will discard its own
      // result via the version guard), so gate-keeping effects (e.g. the login
      // page's redirect) can fire immediately.
      setIsLoading(false);
    },
    [],
  );

  const logout = useCallback(() => {
    setAccessToken(null);
    setRefreshToken(null);
    setUser(null);
    router.push('/login');
  }, [router]);

  const hasPermission = useCallback(
    (permission: string): boolean => {
      if (!user) return false;
      // SUPER_ADMIN has all permissions
      if (user.role === 'SUPER_ADMIN') return true;
      if (user.permissions?.all === true) return true;
      return user.permissions?.[permission] === true;
    },
    [user],
  );

  const hasRole = useCallback(
    (role: Role): boolean => {
      if (!user) return false;
      return user.role === role;
    },
    [user],
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        hasPermission,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
