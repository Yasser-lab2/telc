import { Link, NavLink } from 'react-router-dom';
import { Button } from '../ui/Button';
import { useAuth } from '../../hooks/useAuth';
import { hasActiveSubscription } from '../../lib/api';
import { useI18n } from '../../lib/i18n';
import { ThemeToggle } from '../ui/ThemeToggle';
import { LanguageSwitcher } from '../ui/LanguageSwitcher';

export function Navbar() {
  const { user, subscription, logout } = useAuth();
  const { t, direction } = useI18n();
  const hasLearnerAccess = hasActiveSubscription(subscription);
  function focusMain(event: React.MouseEvent<HTMLAnchorElement>) {
    const main = document.querySelector('main');
    if (!main) return;
    event.preventDefault();
    main.setAttribute('tabindex', '-1');
    main.focus();
  }
  return (
    <header dir={direction} className="top-navigation sticky top-0 z-30 border-b border-border/80 bg-bg/90 backdrop-blur-xl">
      <a className="skip-link" href="#main-content" onClick={focusMain}>{t('skipToContent')}</a>
      <nav aria-label={t('navigation')} className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-4 px-4 md:px-6">
        <Link to="/" className="flex items-center gap-3 text-ink">
          <span className="brand-mark">T</span>
          <span><span className="block text-base font-extrabold leading-none">TELC Prep</span><span className="mt-1 block text-[10px] font-bold uppercase tracking-[0.2em] text-muted">B1 · B2</span></span>
        </Link>
        <div className="navigation-actions flex items-center gap-1 text-sm md:gap-2">
          <NavLink to="/pricing" className="nav-link hidden sm:inline-flex">
            {t('pricing')}
          </NavLink>
          <LanguageSwitcher />
          <ThemeToggle />
          {user ? (
            <>
              {hasLearnerAccess && <NavLink to="/dashboard" className="nav-link">{t('dashboard')}</NavLink>}
              <NavLink to="/dashboard/profile" className="nav-link">
                {t('profile')}
              </NavLink>
              <NavLink to="/payment" className="nav-link">
                {t('payment')}
              </NavLink>
              {user.permissions.includes('admin.access') && (
                <NavLink to="/admin" className="px-2 py-1 text-muted hover:text-text">
                  {t('admin')}
                </NavLink>
              )}
              <Button variant="secondary" onClick={() => logout.mutate()}>
                {t('logout')}
              </Button>
            </>
          ) : (
            <>
              <NavLink to="/login" className="nav-link hidden sm:inline-flex">
                {t('login')}
              </NavLink>
              <Link to="/register">
                <Button>{t('register')}</Button>
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
