import { create } from 'zustand';
import API from '../api/axios';

export interface AuthUser {
  _id: string;
  name: string;
  email: string;
  role: string;
  token: string;
}

interface AuthState {
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (name: string, email: string, password: string, phone?: string) => Promise<AuthUser>;
  logout: () => void;
}

const STORAGE_KEY = 'user';

const readStoredUser = (): AuthUser | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? (JSON.parse(stored) as AuthUser) : null;
  } catch {
    return null;
  }
};

const persistUser = (user: AuthUser | null) => {
  if (user) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
};

export const useAuthStore = create<AuthState>((set) => ({
  user: readStoredUser(),

  login: async (email, password) => {
    const { data } = await API.post<AuthUser>('/auth/login', { email, password });
    persistUser(data);
    set({ user: data });
    return data;
  },

  register: async (name, email, password, phone) => {
    const { data } = await API.post<AuthUser>('/auth/register', { name, email, password, phone });
    persistUser(data);
    set({ user: data });
    return data;
  },

  logout: () => {
    persistUser(null);
    set({ user: null });
  },
}));

export const useAuth = () => useAuthStore();
