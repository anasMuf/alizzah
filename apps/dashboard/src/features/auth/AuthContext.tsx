import { createContext, useContext, useState, useEffect, type ReactNode, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useGetV1AuthMe, getGetV1AuthMeQueryKey } from '../../api/endpoints/auth/auth';

export interface User {
  id: number;
  full_name: string;
  username: string;
  email: string;
  phone: string;
  address: string;
  role: string;
  deposit: number;
}

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  login: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

// ─── In-memory token storage (M03: mitigasi XSS vs localStorage) ───
let _token: string | null = null;

export function getToken(): string | null {
  return _token;
}

export function setTokenValue(token: string | null) {
  _token = token;
}

/**
 * Checks if a token exists in memory.
 * Used by route guards (beforeLoad) which run BEFORE React renders.
 */
export function hasToken(): boolean {
  return !!_token;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Fetch user profile when token is available
  const { data: userResponse, isLoading, isError } = useGetV1AuthMe(
    { query: { enabled: !!token, retry: false, staleTime: 5 * 60 * 1000 } }
  );

  // Gunakan ref untuk stabilkan referensi logout (M02: cegah effect loop)
  const logoutRef = useRef<() => void>(() => {});

  logoutRef.current = () => {
    setTokenValue(null);
    setToken(null);
    localStorage.removeItem('alizzah_role');
    queryClient.removeQueries({ queryKey: getGetV1AuthMeQueryKey() });
  };

  const logout = useCallback(() => {
    logoutRef.current();
  }, []);

  // M02: Effect hanya depend pada isError — logout via ref tidak trigger re-run
  useEffect(() => {
    if (isError) {
      logoutRef.current();
    }
  }, [isError]);

  const login = useCallback((newToken: string) => {
    setTokenValue(newToken);
    setToken(newToken);
    queryClient.invalidateQueries({ queryKey: getGetV1AuthMeQueryKey() });
  }, [queryClient]);

  // Derive user from response
  const user: User | null = (() => {
    if (!userResponse?.data) return null;
    if ('data' in userResponse.data) {
      const u = userResponse.data.data as User;
      if (u && u.role) {
        localStorage.setItem('alizzah_role', u.role);
      }
      return u;
    }
    return null;
  })();

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: !!token && !!user && !isError,
        isLoading: !!token && isLoading,
        user,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
