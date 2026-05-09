import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/index';
import { authApi } from '../api/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const setToken = (token) => {
    if (token) {
      api.defaults.headers.Authorization = `Bearer ${token}`;
    } else {
      delete api.defaults.headers.Authorization;
    }
  };

  // Попытка восстановить сессию при загрузке
  useEffect(() => {
    authApi.refresh()
      .then(({ data }) => {
        setToken(data.accessToken);
        return authApi.me();
      })
      .then(({ data }) => setUser(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Слушаем событие принудительного выхода от interceptor
  useEffect(() => {
    const handler = () => { setUser(null); setToken(null); };
    window.addEventListener('auth:logout', handler);
    return () => window.removeEventListener('auth:logout', handler);
  }, []);

  const login = useCallback(async (email, password) => {
    const { data } = await authApi.login(email, password);
    setToken(data.accessToken);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout().catch(() => {});
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthed: !!user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
