import { create } from 'zustand';

export interface User {
  id: string;
  email: string;
  role: 'user' | 'partner' | 'admin';
}

interface AuthState {
  user: User | null;
  token: string | null;
  login: (user: User, token: string) => void;
  logout: () => void;
  initAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  login: (user, token) => {
    localStorage.setItem('auth_token', token);
    set({ user, token });
  },
  logout: () => {
    localStorage.removeItem('auth_token');
    set({ user: null, token: null });
  },
  initAuth: async () => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      try {
        const res = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const user = await res.json();
          set({ user, token });
        } else {
          localStorage.removeItem('auth_token');
          set({ user: null, token: null });
        }
      } catch (e) {
        localStorage.removeItem('auth_token');
        set({ user: null, token: null });
      }
    }
  }
}));
