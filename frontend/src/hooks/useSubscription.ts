import { useAuth } from './useAuth';

export function useSubscription() {
  const { subscription, isLoading } = useAuth();
  return { subscription, isLoading };
}
