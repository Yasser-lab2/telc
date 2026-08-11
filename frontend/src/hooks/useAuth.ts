import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { apiClient, type SubscriptionState, type User } from '../lib/api';
import { useAuthStore } from '../store/authStore';

export function useAuth() {
  const queryClient = useQueryClient();
  const setAuth = useAuthStore((state) => state.setAuth);
  const auth = useAuthStore();

  const me = useQuery({
    queryKey: ['me'],
    queryFn: apiClient.me,
    retry: false,
  });

  useEffect(() => {
    if (me.data && auth.user?.id !== me.data.user.id) {
      setAuth(me.data.user, me.data.subscription);
    }
  }, [auth.user?.id, me.data, setAuth]);

  const login = useMutation({
    mutationFn: apiClient.login,
    onSuccess: (data: { user: User; subscription?: SubscriptionState }) => {
      setAuth(data.user, data.subscription ?? null);
      queryClient.invalidateQueries({ queryKey: ['me'] });
    },
  });

  const register = useMutation({
    mutationFn: apiClient.register,
    onSuccess: (data: { user: User; subscription?: SubscriptionState }) => {
      setAuth(data.user, data.subscription ?? null);
      queryClient.invalidateQueries({ queryKey: ['me'] });
    },
  });

  const logout = useMutation({
    mutationFn: apiClient.logout,
    onSuccess: () => {
      setAuth(null, null);
      queryClient.clear();
    },
  });

  return {
    user: me.data?.user ?? auth.user,
    subscription: me.data?.subscription ?? auth.subscription,
    isLoading: me.isLoading,
    login,
    register,
    logout,
  };
}
