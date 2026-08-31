import { create } from 'zustand';
import { request, gql } from 'graphql-request';

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

const endpoint = 'http://localhost:5000/graphql';

export const useAuthStore = create<AuthState>((set) => ({
  user: readStoredUser(),

  login: async (email, password) => {
    const mutation = gql`
      mutation Login($email: String!, $password: String!) {
        login(email: $email, password: $password) {
          token
          user { id name email role }
        }
      }
    `;
    const payload = await request(endpoint, mutation, { email, password });
    const user = {
      _id: (payload as any).login.user.id,
      name: (payload as any).login.user.name,
      email: (payload as any).login.user.email,
      role: (payload as any).login.user.role,
      token: (payload as any).login.token,
    };
    persistUser(user);
    set({ user });
    return user;
  },

  register: async (name, email, password, phone) => {
    const mutation = gql`
      mutation Register($name: String!, $email: String!, $password: String!, $phone: String) {
        register(name: $name, email: $email, password: $password, phone: $phone) {
          token
          user { id name email role }
        }
      }
    `;
    const payload = await request(endpoint, mutation, { name, email, password, phone });
    const user = {
      _id: (payload as any).register.user.id,
      name: (payload as any).register.user.name,
      email: (payload as any).register.user.email,
      role: (payload as any).register.user.role,
      token: (payload as any).register.token,
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
