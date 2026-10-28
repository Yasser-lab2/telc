import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { hasActiveSubscription } from '../../lib/api';
import { useI18n } from '../../lib/i18n';
import { ThemeToggle } from '../ui/ThemeToggle';
import { LanguageSwitcher } from '../ui/LanguageSwitcher';

export function DashboardLayout() {
  const { user, subscription, logout } = useAuth();
  const { t, direction } = useI18n();
  const location = useLocation();
  const initial = user?.displayName?.charAt(0).toUpperCase() ?? user?.email?.charAt(0).toUpperCase() ?? 'U';
  const hasLearnerAccess = hasActiveSubscription(subscription);
  const homePath = hasLearnerAccess ? '/dashboard' : '/dashboard/profile';
  const mainLinks = [
    [t('dashboard'), '/dashboard'], [t('reading'), '/dashboard/lesen'], [t('listening'), '/dashboard/horen'],
    [t('writing'), '/dashboard/schreiben'], [t('speaking'), '/dashboard/speaking'], [t('simulation'), '/dashboard/simulation'],
  ];

  return (
    <div className="app-canvas min-h-screen text-ink" dir={direction}>
      <header className="top-navigation sticky top-0 z-20 border-b border-border/80 bg-bg/90 backdrop-blur-xl">
         <a className="skip-link" href="#main-content">{t('skipToContent')}</a>
        <nav aria-label={t('navigation')} className="mx-auto flex min-h-16 w-full max-w-7xl items-center justify-between gap-3 px-4 md:px-6">
          <Link to={homePath} className="flex shrink-0 items-center gap-3">
            <span className="brand-mark">T</span>
            <span>
              <span className="block text-base font-black leading-tight">TELC Prep</span>
              <span className="block text-[10px] font-bold tracking-[0.12em] text-muted">B1 · B2</span>
            </span>
          </Link>

          {hasLearnerAccess && (
            <div className="desktop-navigation hidden items-center gap-1 rounded-xl border border-border bg-surface p-1 shadow-sm lg:flex">
              {mainLinks.map(([label, to]) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    // Explicit startsWith keeps parent items highlighted on detail routes such as /dashboard/lesen/:themeId.
                    `rounded-lg px-3 py-2 text-sm font-bold transition ${
                      (to === '/dashboard' ? location.pathname === to : isActive || location.pathname.startsWith(`${to}/`))
                        ? 'bg-accent text-white shadow-sm'
                        : 'text-muted hover:bg-bg hover:text-ink'
                    }`
                  }
                >
                  {label}
                </NavLink>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <ThemeToggle />
            <Link
              to="/dashboard/profile"
              aria-label={t('profile')}
              className="flex min-h-10 items-center gap-2 rounded-full border border-border bg-surface py-1 pl-1 pr-3 text-sm font-bold transition hover:border-accent/40"
            >
              <span className="grid h-8 w-8 place-items-center rounded-full bg-accentSoft text-xs text-accentDark">{initial}</span>
              <span>{t('profile')}</span>
              <span className="hidden max-w-28 truncate text-muted md:inline">· {user?.displayName}</span>
            </Link>
            <Link to="/payment" className="hidden min-h-10 items-center rounded-full border border-border px-3 text-sm font-bold text-muted transition hover:border-accent/40 hover:text-ink sm:inline-flex">
              {t('payment')}
            </Link>
            <button
              type="button"
              onClick={() => logout.mutate()}
              aria-label={t('logout')}
              className="hidden min-h-10 rounded-full px-3 text-sm font-bold text-muted transition hover:bg-red-50 hover:text-red-700 sm:block"
            >
              {t('logout')}
            </button>
          </div>
        </nav>
      </header>

      {hasLearnerAccess && (
        <nav aria-label={t('menu')} className="mobile-navigation fixed inset-x-3 bottom-3 z-30 grid grid-cols-6 rounded-2xl border border-border bg-surface/95 p-1 shadow-xl backdrop-blur lg:hidden">
          {mainLinks.map(([label, to]) => <NavLink key={to} to={to} className={({ isActive }) => `truncate rounded-xl px-1 py-3 text-center text-[11px] font-bold ${isActive ? 'bg-accent text-white' : 'text-muted'}`}>{label}</NavLink>)}
        </nav>
      )}

      <main id="main-content" tabIndex={-1} className={`mx-auto w-full max-w-7xl px-4 py-8 md:px-6 lg:py-10 ${hasLearnerAccess ? 'pb-24' : ''}`}>
        <Outlet />
      </main>
    </div>
  );
}
