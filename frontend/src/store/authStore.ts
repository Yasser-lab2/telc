import { create } from 'zustand';
import type { SubscriptionState, User } from '../lib/api';

type AuthState = {
  user: User | null;
  subscription: SubscriptionState | null;
  setAuth: (user: User | null, subscription: SubscriptionState | null) => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  subscription: null,
  setAuth: (user, subscription) => set({ user, subscription }),
}));
