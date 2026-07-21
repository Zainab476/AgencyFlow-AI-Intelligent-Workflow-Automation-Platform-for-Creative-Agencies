// This file only creates and exports the AuthContext object.
// Kept separate so AuthContext.tsx (component) and useAuth.ts (hook)
// can each import from here without mixing component/non-component exports
// in the same file — which would break Vite Fast Refresh.
import { createContext } from 'react';

export interface AuthContextType {
  token: string | null;
  isAuthenticated: boolean;
  login: (token: string) => void;
  logout: () => void;
  isInitializing: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
