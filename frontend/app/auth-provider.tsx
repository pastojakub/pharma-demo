'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import { useRouter } from 'next/navigation';
import { useToast } from '../components/ToastProvider';
import { User } from '../types';
import { authCookies } from '../lib/auth-cookies';

interface AuthContextType {
  user: User | null;
  login: (token: string, role: string, email: string, org: string) => void;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { showToast } = useToast();

  useEffect(() => {
    const token = Cookies.get('auth_token');
    const role = Cookies.get('user_role');
    const email = Cookies.get('user_email');
    const org = Cookies.get('user_org');
    
    if (token) {
      try {
        // Simple base64 decode for the payload
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));

        const payload = JSON.parse(jsonPayload);
        const currentTime = Date.now() / 1000;

        if (payload.exp < currentTime) {
          console.warn('Token expired on load');
          logout();
        } else if (role && email && org) {
          setUser({ email, role, org });
        }
      } catch (e) {
        console.error('Error decoding token', e);
        logout();
      }
    }
    setLoading(false);
  }, []);

  const login = (token: string, role: string, email: string, org: string) => {
    authCookies.set(token, role, email, org);
    setUser({ email, role, org });

    showToast('Prihlásenie úspešné', 'success');
    router.push('/dashboard');
  };

  const logout = () => {
    authCookies.clear();
    setUser(null);

    showToast('Odhlásenie úspešné', 'info');
    router.push('/');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
