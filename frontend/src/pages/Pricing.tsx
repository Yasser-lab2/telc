import { useMutation, useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { Icon } from '../components/landing/icons';
import { LandingFooter, LandingHeader } from '../components/landing/LandingChrome';
import '../components/landing/landing.css';
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
  const steps = [
    [t('chooseOfferStep'), t('chooseOfferHelp')],
    [t('transferStep'), t('transferHelp')],
    [t('accessStep'), t('accessHelp')],
  ];

  return (
    <div className="kk kk-page" dir={direction}>
      <LandingHeader active="pricing" showPricing />
      <main id="main-content" tabIndex={-1} className="kk-wrap kk-pricing" style={{ outline: 'none' }}>
        <div className="kk-pricing-intro">
          <span className="kk-section-eyebrow mono">{t('pricingIntro')}</span>
          <h1 className="kk-h2 serif">{t('pricingTitle')}</h1>
          <p className="kk-h2-sub">{t('pricingDescription')}</p>
        </div>

        <div className="kk-plans">
          {plans.data?.plans.map((plan: Plan) => {
            const trial = plan.id === 'trial';
            return (
              <article key={plan.id} className={trial ? 'kk-plan kk-plan-trial' : 'kk-plan'}>
                <span className="kk-plan-tag mono">{trial ? t('discovery') : t('daysLabel', { count: plan.durationDays })}</span>
                <h2 className="kk-plan-name">{plan.name}</h2>
                <p className="kk-plan-price serif">{formatMad(plan.priceMad, locale)}</p>
                <ul className="kk-plan-list">
                  {[t('accessModules'), t('dailyAi', { count: plan.aiCreditsPerDay }), t('subscriptionTracking')].map((line) => (
                    <li key={line}><Icon name="check" size={16} /><span>{line}</span></li>
                  ))}
                </ul>
                <button
                  type="button"
                  className={trial ? 'kk-plan-btn kk-plan-btn-off' : 'kk-cta kk-plan-btn'}
                  disabled={trial || createPayment.isPending}
                  onClick={() => {
                    if (!user) {
                      navigate('/login');
                      return;
                    }
                    createPayment.mutate(plan.id);
                  }}
                >
                  {trial ? t('includedAtSignup') : t('chooseOffer')}
                </button>
              </article>
            );
          })}
        </div>

        {!user && (
          <p className="kk-pricing-note">
            {t('alreadyDecided')} <Link className="kk-auth-link" to="/register">{t('createAccountButton')}</Link> {t('createThenChoose')}
          </p>
        )}

        <section className="kk-steps" aria-label={t('pricingTitle')}>
          {steps.map(([title, body], index) => (
            <div key={title} className="kk-step">
              <span className="kk-step-n mono">0{index + 1}</span>
              <p className="kk-step-t">{title}</p>
              <p className="kk-step-b">{body}</p>
            </div>
          ))}
        </section>
      </main>
      <LandingFooter />
    </div>
  );
}
