import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useSubscription } from '../../hooks/useSubscription';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

export function SubscriptionGate({ children }: { children: ReactNode }) {
  const { subscription, isLoading } = useSubscription();
  if (isLoading) return null;
  if (!subscription?.isActive) {
    return (
      <Card className="text-center">
        <h2 className="text-xl font-bold">Abonnement requis</h2>
        <p className="mt-2 text-muted">Choisis un pack et contacte-nous sur WhatsApp pour activer l'accès.</p>
        <Link to="/pricing" className="mt-4 inline-block">
          <Button>Voir les packs</Button>
        </Link>
      </Card>
    );
  }
  return children;
}
