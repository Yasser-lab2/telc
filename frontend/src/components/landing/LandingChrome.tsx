import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { hasActiveSubscription } from '../../lib/api';
import { useI18n } from '../../lib/i18n';
import { useTheme } from '../../lib/theme';
import { LanguageSwitcher } from '../ui/LanguageSwitcher';
import { Icon } from './icons';

export function LandingHeader({ active, showPricing = false }: { active?: 'login' | 'register' | 'pricing'; showPricing?: boolean }) {
  const { user, subscription, logout } = useAuth();
  const { t, direction } = useI18n();
  const { theme, toggleTheme } = useTheme();
  const dark = theme === 'dark';
  const hasLearnerAccess = hasActiveSubscription(subscription);

  return (
    <header className="kk-header" data-auth={active ? '' : undefined} dir={direction}>
      <a
        className="skip-link"
        href="#main-content"
        onClick={(event) => {
          const main = document.querySelector('main');
          if (!main) return;
          event.preventDefault();
          main.focus();
        }}
      >
        {t('skipToContent')}
      </a>
      <nav aria-label={t('navigation')} className="kk-wrap kk-header-row">
        <div className="kk-brand-wrap">
          <Link to="/" className="kk-brand">
            <span className="kk-brand-mark" aria-hidden="true">K</span>
            <span>
              <span className="kk-brand-name serif">Kolchi Klar</span>
              <span className="kk-brand-sub">B1 · B2</span>
            </span>
          </Link>
          <span className="kk-beta">{t('betaFree')}</span>
        </div>
        <div className="kk-actions">
          {showPricing && <Link className="kk-link-w kk-hide-sm" to="/pricing" aria-current={active === 'pricing' ? 'page' : undefined}>{t('pricing')}</Link>}
          <div className="kk-lang-wrap kk-lang"><LanguageSwitcher /></div>
          <button
            type="button"
            className="kk-btn-outline-w"
            onClick={toggleTheme}
            aria-pressed={dark}
            aria-label={dark ? t('lightMode') : t('darkMode')}
          >
            <Icon name={dark ? 'moon' : 'sun'} size={16} />
            <span className="kk-hide-sm">{dark ? t('dark') : t('light')}</span>
          </button>
          {user ? (
            <>
              {hasLearnerAccess && <Link className="kk-link-w" to="/dashboard">{t('dashboard')}</Link>}
              <Link className="kk-link-w" to="/dashboard/profile">{t('profile')}</Link>
              <button type="button" className="kk-signup" style={{ background: 'transparent', cursor: 'pointer', font: 'inherit', fontSize: '0.75rem', fontWeight: 700 }} onClick={() => logout.mutate()}>{t('logout')}</button>
            </>
          ) : (
            <>
              {active === 'login'
                ? <span className="kk-nav-active" aria-current="page">{t('login')}</span>
                : <Link className="kk-link-w" to="/login">{t('login')}</Link>}
              {active === 'register'
                ? <span className="kk-nav-active" aria-current="page">{t('register')}</span>
                : <Link className="kk-signup" to="/register">{t('register')}</Link>}
            </>
          )}
        </div>
      </nav>
    </header>
  );
}

export function LandingFooter() {
  const { t, direction } = useI18n();
  return (
    <footer className="kk-footer" dir={direction}>
      <div className="kk-wrap kk-footer-row">
        <div className="kk-footer-l">
          <span className="kk-mini" aria-hidden="true">K</span>
          <strong>Kolchi Klar</strong>
          <span>· {t('footTagline')}</span>
        </div>
        <nav aria-label={t('legalInformation')} className="kk-footer-r">
          <Link to="/legal/terms">{t('terms')}</Link>
          <Link to="/legal/privacy">{t('privacy')}</Link>
          <Link to="/legal/refunds">{t('refunds')}</Link>
          <span>© 2026 Kolchi Klar</span>
        </nav>
      </div>
    </footer>
  );
}
