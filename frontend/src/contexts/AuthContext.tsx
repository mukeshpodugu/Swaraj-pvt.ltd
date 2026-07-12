import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';
import { User, UserRole } from '../../../shared/src/types';

// Configure Axios Defaults
axios.defaults.baseURL = 'http://localhost:5000';
axios.defaults.withCredentials = true;

interface AuthContextType {
  user: User & { customerProfileId?: string } | null;
  loading: boolean;
  accessToken: string | null;
  login: (email: string, password: string) => Promise<void>;
  googleSignIn: (email: string, fullName: string, photoUrl: string, googleUid: string) => Promise<void>;
  register: (email: string, password: string, fullName: string, phone: string, role: UserRole) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User & { customerProfileId?: string } | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Set Authorization Header Helper
  const setAuthHeader = (token: string | null) => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  };

  // Attempt Session Recovery / Refresh Token flow on boot
  useEffect(() => {
    async function recoverSession() {
      try {
        const res = await axios.post('/api/auth/refresh');
        if (res.data.accessToken) {
          setAccessToken(res.data.accessToken);
          setUser(res.data.user);
          setAuthHeader(res.data.accessToken);
        }
      } catch (err) {
        // Refresh token not found/expired - user remains logged out
      } finally {
        setLoading(false);
      }
    }
    recoverSession();
  }, []);

  // Axios Response Interceptor for Auto-Logout on 401/403
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response && [401, 403].includes(error.response.status)) {
          // If it was a refresh attempt, don't trigger recursive logs
          if (error.config.url === '/api/auth/refresh') {
            return Promise.reject(error);
          }

          // Attempt one-time silent refresh before declaring logout
          try {
            const refreshRes = await axios.post('/api/auth/refresh');
            const newAccessToken = refreshRes.data.accessToken;
            setAccessToken(newAccessToken);
            setAuthHeader(newAccessToken);
            
            // Retry the original failed request
            error.config.headers['Authorization'] = `Bearer ${newAccessToken}`;
            return axios(error.config);
          } catch (refreshErr) {
            // Both refresh and original token failed -> force logout
            setUser(null);
            setAccessToken(null);
            setAuthHeader(null);
            // Optionally redirect to login in router
          }
        }
        return Promise.reject(error);
      }
    );

    return () => axios.interceptors.response.eject(interceptor);
  }, []);

  const login = async (email: string, password: string) => {
    const res = await axios.post('/api/auth/login', { email, password });
    setAccessToken(res.data.accessToken);
    setUser(res.data.user);
    setAuthHeader(res.data.accessToken);
  };

  const googleSignIn = async (email: string, fullName: string, photoUrl: string, googleUid: string) => {
    const res = await axios.post('/api/auth/google-signin', { email, fullName, photoUrl, googleUid });
    setAccessToken(res.data.accessToken);
    setUser(res.data.user);
    setAuthHeader(res.data.accessToken);
  };

  const register = async (email: string, password: string, fullName: string, phone: string, role: UserRole) => {
    const res = await axios.post('/api/auth/register', { email, password, fullName, phone, role });
    setAccessToken(res.data.accessToken);
    setUser(res.data.user);
    setAuthHeader(res.data.accessToken);
  };

  const logout = async () => {
    try {
      await axios.post('/api/auth/logout');
    } catch (err) {
      // Ignore network errors on logout
    } finally {
      setUser(null);
      setAccessToken(null);
      setAuthHeader(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, accessToken, login, googleSignIn, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
