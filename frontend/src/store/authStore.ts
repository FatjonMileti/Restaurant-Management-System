import { create } from 'zustand';
import { client } from '../graphql/client';
import { LOGIN, REGISTER } from '../graphql/queries';

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
    const { data } = await client.mutate({ mutation: LOGIN, variables: { email, password } });
    const payload = (data as any)?.login;
    const user = {
      _id: payload.user.id,
      name: payload.user.name,
      email: payload.user.email,
      role: payload.user.role,
      token: payload.token,
    };
    persistUser(user);
    set({ user });
    return user;
  },

  register: async (name, email, password, phone) => {
    const { data } = await client.mutate({ mutation: REGISTER, variables: { name, email, password, phone } });
    const payload = (data as any)?.register;
    const user = {
      _id: payload.user.id,
      name: payload.user.name,
      email: payload.user.email,
      role: payload.user.role,
      token: payload.token,
    };
    persistUser(user);
    set({ user });
    return user;
  },

  logout: () => {
    persistUser(null);
    set({ user: null });
  },
}));

export const useAuth = () => useAuthStore();
