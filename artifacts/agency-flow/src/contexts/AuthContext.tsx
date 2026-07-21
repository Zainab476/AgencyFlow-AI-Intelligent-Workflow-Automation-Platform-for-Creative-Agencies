import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useLocation } from 'wouter';
import { setAuthTokenGetter } from '@workspace/api-client-react';

interface AuthContextType {
  token: string | null;
  isAuthenticated: boolean;
  login: (token: string) => void;
  logout: () => void;
  isInitializing: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'af_token';

// Connect the token to our custom fetch client immediately
setAuthTokenGetter(() => localStorage.getItem(TOKEN_KEY));

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [, setLocation] = useLocation();

  useEffect(() => {
    const storedToken = localStorage.getItem(TOKEN_KEY);
    if (storedToken) {
      setToken(storedToken);
    }
    setIsInitializing(false);
  }, []);

  const login = (newToken: string) => {
    localStorage.setItem(TOKEN_KEY, newToken);
    setToken(newToken);
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setLocation('/login');
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        isAuthenticated: !!token,
        login,
        logout,
        isInitializing,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

