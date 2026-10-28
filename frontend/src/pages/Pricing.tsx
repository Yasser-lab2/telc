import { useMutation, useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { Footer } from '../components/layout/Footer';
import { Navbar } from '../components/layout/Navbar';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { apiClient, type Plan } from '../lib/api';
import { formatMad } from '../lib/utils';
import { useAuth } from '../hooks/useAuth';
import { useI18n } from '../lib/i18n';

export function Pricing() {
  const { user } = useAuth();
  const { direction, locale, t } = useI18n();
  const navigate = useNavigate();
  const plans = useQuery({ queryKey: ['plans'], queryFn: apiClient.plans });
  const createPayment = useMutation({
    mutationFn: apiClient.createPayment,
    onSuccess: (data: { paymentId: string; whatsappUrl: string }) => {
      window.location.href = data.whatsappUrl;
    },
  });

  return (
    <div className="app-canvas min-h-screen" dir={direction}>
      <Navbar />
      <main id="main-content" tabIndex={-1} className="mx-auto max-w-7xl px-4 py-16 md:px-6">
        <div className="max-w-2xl"><p className="text-xs font-extrabold uppercase tracking-[0.18em] text-accent">{t('pricingIntro')}</p><h1 className="mt-3 text-4xl font-black tracking-tight text-ink md:text-5xl">{t('pricingTitle')}</h1><p className="mt-4 text-lg leading-8 text-muted">{t('pricingDescription')}</p></div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {plans.data?.plans.map((plan: Plan) => (
            <Card key={plan.id} className={`flex flex-col ${plan.id !== 'trial' ? 'hover:border-accent/40' : 'bg-bg/70'}`}>
              <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-accent">{plan.id === 'trial' ? t('discovery') : t('daysLabel', { count: plan.durationDays })}</p>
              <h2 className="mt-3 text-xl font-black text-ink">{plan.name}</h2>
              <p className="mt-5 text-3xl font-black text-ink">{formatMad(plan.priceMad, locale)}</p>
              <div className="mt-5 space-y-3 border-t border-border pt-5 text-sm text-muted"><p>✓ {t('accessModules')}</p><p>✓ {t('dailyAi', { count: plan.aiCreditsPerDay })}</p><p>✓ {t('subscriptionTracking')}</p></div>
              <Button
                className="mt-7 w-full"
                disabled={plan.id === 'trial' || createPayment.isPending}
                onClick={() => {
                  if (!user) {
                    navigate('/login');
                    return;
                  }
                  createPayment.mutate(plan.id);
                }}
              >
                {plan.id === 'trial' ? t('includedAtSignup') : t('chooseOffer')}
              </Button>
            </Card>
          ))}
        </div>
        {!user && (
          <p className="mt-8 text-sm text-muted">
            {t('alreadyDecided')} <Link className="font-semibold text-accent" to="/register">{t('createAccountButton')}</Link> {t('createThenChoose')}
          </p>
        )}
        <section className="mt-12 grid gap-4 rounded-2xl border border-border bg-surface p-6 md:grid-cols-3"><div><p className="font-black text-ink">1. {t('chooseOfferStep')}</p><p className="mt-2 text-sm text-muted">{t('chooseOfferHelp')}</p></div><div><p className="font-black text-ink">2. {t('transferStep')}</p><p className="mt-2 text-sm text-muted">{t('transferHelp')}</p></div><div><p className="font-black text-ink">3. {t('accessStep')}</p><p className="mt-2 text-sm text-muted">{t('accessHelp')}</p></div></section>
      </main>
      <Footer />
    </div>
  );
}
