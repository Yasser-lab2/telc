import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useSubscription } from '../../hooks/useSubscription';
import { hasActiveSubscription } from '../../lib/api';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { useI18n } from '../../lib/i18n';

export function SubscriptionGate({ children }: { children: ReactNode }) {
  const { subscription, isLoading } = useSubscription();
  const { t } = useI18n();
  if (isLoading) return null;
  if (!hasActiveSubscription(subscription)) {
    return (
      <Card className="text-center">
        <h2 className="text-xl font-bold">{t('subscriptionRequired')}</h2>
        <p className="mt-2 text-muted">{t('subscriptionRequiredHelp')}</p>
        <Link to="/pricing" className="mt-4 inline-block">
          <Button>{t('viewPlans')}</Button>
        </Link>
      </Card>
    );
  }
  return children;
}
