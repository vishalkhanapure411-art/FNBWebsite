'use client';

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
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

  // Restore session on mount
  useEffect(() => {
    const restoreSession = async () => {
      const token = getStoredToken();
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await api.get<{ data: User }>('/auth/me');
        setUser(response.data ?? (response as unknown as User));
      } catch {
        // Token expired or invalid — clear it
        setAccessToken(null);
        setRefreshToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();
  }, []);

  const login = useCallback(
    async (email: string, password: string, rememberMe = false) => {
      const response = await api.post<{
        accessToken: string;
        refreshToken: string;
        user: User;
      }>('/auth/login', { email, password, rememberMe });

      setAccessToken(response.accessToken);
      setRefreshToken(response.refreshToken);
      setUser(response.user);
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
