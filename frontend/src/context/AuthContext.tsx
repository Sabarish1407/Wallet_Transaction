import React, { createContext, useContext, useEffect, useState } from 'react';
import { Role } from '../types';

interface AuthUser {
  userId: number;
  userNumber?: string;
  email: string;
  fullName: string;
  role: Role;
  passwordResetRequired: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
  updateResetRequired: (required: boolean) => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('wallet_token');
    const savedUser = localStorage.getItem('wallet_user');
    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem('wallet_token');
        localStorage.removeItem('wallet_user');
      }
    }
    setIsLoading(false);

    const handleForceReset = () => {
      setUser((prev) => (prev ? { ...prev, passwordResetRequired: true } : null));
    };

    window.addEventListener('password_reset_required', handleForceReset);
    return () => window.removeEventListener('password_reset_required', handleForceReset);
  }, []);

  const login = (newToken: string, newUser: AuthUser) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('wallet_token', newToken);
    localStorage.setItem('wallet_user', JSON.stringify(newUser));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('wallet_token');
    localStorage.removeItem('wallet_user');
  };

  const updateResetRequired = (required: boolean) => {
    if (user) {
      const updated = { ...user, passwordResetRequired: required };
      setUser(updated);
      localStorage.setItem('wallet_user', JSON.stringify(updated));
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, updateResetRequired, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
