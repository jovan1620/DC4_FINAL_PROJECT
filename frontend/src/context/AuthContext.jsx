
import {
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function checkLogin() {
      const token = localStorage.getItem('canteen_token');

      if (!token) {
        if (active) setLoading(false);
        return;
      }

      try {
        const response = await api.get('/user');

        if (active) {
          setUser(response.data.user);
        }
      } catch {
        if (active) {
          localStorage.removeItem('canteen_token');
          setUser(null);
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    checkLogin();

    return () => {
      active = false;
    };
  }, []);

  async function login(credentials) {
    const response = await api.post('/login', credentials);

    localStorage.setItem('canteen_token', response.data.token);
    setUser(response.data.user);

    return response.data.user;
  }

  async function register(details) {
    const response = await api.post('/register', details);

    localStorage.setItem('canteen_token', response.data.token);
    setUser(response.data.user);

    return response.data.user;
  }

  async function logout() {
    try {
      await api.post('/logout');
    } finally {
      localStorage.removeItem('canteen_token');
      setUser(null);
    }
  }

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return context;
}
