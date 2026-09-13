import { create } from 'zustand';

export interface User {
  id: number;
  email: string;
  display_name?: string;
  is_staff?: boolean;
  created_at: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isInitialized: boolean;
  setAuth: (user: User, access: string, refresh: string) => void;
  updateUser: (partialUser: Partial<User>) => void;
  setAccessToken: (access: string) => void;
  logout: () => void;
  initialize: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isInitialized: false,

  setAuth: (user, access, refresh) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('accessToken', access);
      localStorage.setItem('refreshToken', refresh);
    }
    set({ user, accessToken: access, refreshToken: refresh });
  },

  updateUser: (partialUser) => {
    set((state) => {
      if (!state.user) return state;
      const updatedUser = { ...state.user, ...partialUser };
      if (typeof window !== 'undefined') {
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }
      return { ...state, user: updatedUser };
    });
  },

  setAccessToken: (access) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('accessToken', access);
    }
    set({ accessToken: access });
  },

  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('user');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    }
    set({ user: null, accessToken: null, refreshToken: null });
  },

  initialize: () => {
    if (typeof window !== 'undefined') {
      const userStr = localStorage.getItem('user');
      const access = localStorage.getItem('accessToken');
      const refresh = localStorage.getItem('refreshToken');

      let user: User | null = null;
      if (userStr) {
        try {
          user = JSON.parse(userStr);
        } catch {
          user = null;
        }
      }
      set({ user, accessToken: access, refreshToken: refresh, isInitialized: true });
    } else {
      set({ isInitialized: true });
    }
  },
}));
