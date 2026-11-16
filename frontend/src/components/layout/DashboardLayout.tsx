import { Link, Outlet, useLocation } from 'react-router-dom';
import { Icon } from '../landing/icons';
import '../landing/landing.css';
import { useAuth } from '../../hooks/useAuth';
import { hasActiveSubscription } from '../../lib/api';
import { useI18n } from '../../lib/i18n';
import { useTheme } from '../../lib/theme';
import { LanguageSwitcher } from '../ui/LanguageSwitcher';

export function DashboardLayout() {
  const { user, subscription, logout } = useAuth();
  const { t, direction } = useI18n();
  const { theme, toggleTheme } = useTheme();
  const dark = theme === 'dark';
  const location = useLocation();
  const initial = user?.displayName?.charAt(0).toUpperCase() ?? user?.email?.charAt(0).toUpperCase() ?? 'U';
  const hasLearnerAccess = hasActiveSubscription(subscription);
  const isAdmin = Boolean(user?.permissions.includes('admin.access'));
  const homePath = hasLearnerAccess ? '/dashboard' : '/dashboard/profile';
  const mainLinks = [
    [t('dashboard'), '/dashboard'], [t('reading'), '/dashboard/lesen'], [t('listening'), '/dashboard/horen'],
    [t('writing'), '/dashboard/schreiben'], [t('speaking'), '/dashboard/speaking'], [t('simulation'), '/dashboard/simulation'],
  ];
  // Explicit prefix match keeps parent items highlighted on detail routes such as /dashboard/lesen/:themeId.
  const isActive = (to: string) => (to === '/dashboard' ? location.pathname === to : location.pathname === to || location.pathname.startsWith(`${to}/`));

  return (
    <div className="kk kk-page" dir={direction}>
      <header className="kk-header">
        <a className="skip-link" href="#main-content">{t('skipToContent')}</a>
        <nav aria-label={t('navigation')} className="kk-wrap kk-wrap-xl kk-header-row">
          <div className="kk-brand-wrap">
            <Link to={homePath} className="kk-brand">
              <span className="kk-brand-mark" aria-hidden="true">K</span>
              <span>
                <span className="kk-brand-name serif">Kolchi Klar</span>
                <span className="kk-brand-sub">B1 · B2</span>
              </span>
            </Link>
            {hasLearnerAccess && (
              <div className="kk-nav">
                {mainLinks.map(([label, to]) => <Link key={to} to={to} aria-current={isActive(to) ? 'page' : undefined}>{label}</Link>)}
              </div>
            )}
          </div>
          <div className="kk-actions">
            <div className="kk-lang-wrap kk-lang"><LanguageSwitcher /></div>
            <button type="button" className="kk-btn-outline-w" onClick={toggleTheme} aria-pressed={dark} aria-label={dark ? t('lightMode') : t('darkMode')}>
              <Icon name={dark ? 'moon' : 'sun'} size={16} />
              <span className="kk-hide-sm">{dark ? t('dark') : t('light')}</span>
            </button>
            <Link to="/dashboard/profile" aria-label={t('profile')} className="kk-btn-outline-w">
              <span className="kk-avatar" aria-hidden="true">{initial}</span>
              <span className="kk-hide-sm">{t('profile')} · {user?.displayName}</span>
            </Link>
            <Link to="/payment" className="kk-btn-outline-w kk-from-sm">{t('payment')}</Link>
            {isAdmin && <Link to="/admin" className="kk-btn-outline-w kk-from-sm">{t('admin')}</Link>}
            <button type="button" className="kk-link-w kk-from-sm kk-plain-btn" onClick={() => logout.mutate()}>{t('logout')}</button>
          </div>
        </nav>
        {(
          <nav aria-label={t('menu')} className="kk-subnav">
            {hasLearnerAccess && mainLinks.map(([label, to]) => <Link key={to} to={to} aria-current={isActive(to) ? 'page' : undefined}>{label}</Link>)}
            <Link to="/payment" className="kk-sub-extra">{t('payment')}</Link>
            {isAdmin && <Link to="/admin" className="kk-sub-extra">{t('admin')}</Link>}
            <button type="button" className="kk-sub-extra" onClick={() => logout.mutate()}>{t('logout')}</button>
          </nav>
        )}
      </header>

      <main id="main-content" tabIndex={-1} className="kk-wrap kk-wrap-xl kk-app-main" style={{ outline: 'none' }}>
        <Outlet />
      </main>
      <footer className="kk-auth-footer" style={{ background: 'var(--kk-card)' }}>© 2026 Kolchi Klar</footer>
    </div>
  );
}
