import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useI18n } from '../../lib/i18n';

export function DashboardLayout() {
  const { user, logout } = useAuth();
  const { locale, setLocale, t } = useI18n();
  const location = useLocation();
  const initial = user?.displayName?.charAt(0).toUpperCase() ?? user?.email?.charAt(0).toUpperCase() ?? 'U';
  const mainLinks = [
    [t('dashboard'), '/dashboard'], [t('reading'), '/dashboard/lesen'], [t('listening'), '/dashboard/horen'],
    [t('writing'), '/dashboard/schreiben'], [t('simulation'), '/dashboard/simulation'],
  ];

  return (
    <div className="app-canvas min-h-screen text-ink" dir="ltr">
      <header className="sticky top-0 z-20 border-b border-border/80 bg-bg/90 backdrop-blur-xl">
        <nav aria-label={t('navigation')} className="mx-auto flex min-h-16 w-full max-w-7xl items-center justify-between gap-3 px-4 md:px-6">
          <Link to="/dashboard" className="flex shrink-0 items-center gap-3">
            <span className="brand-mark">T</span>
            <span>
              <span className="block text-base font-black leading-tight">TELC Prep</span>
              <span className="block text-[10px] font-bold uppercase tracking-[0.2em] text-muted">B1 · B2</span>
            </span>
          </Link>

          <div className="hidden items-center gap-1 rounded-xl border border-border bg-surface p-1 shadow-sm lg:flex">
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

          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setLocale(locale === 'fr' ? 'de' : 'fr')} className="nav-link" aria-label={t('language')}>{locale.toUpperCase()}</button>
            <Link
              to="/dashboard/profile"
              aria-label={t('profile')}
              className="flex min-h-10 items-center gap-2 rounded-full border border-border bg-surface py-1 pl-1 pr-3 text-sm font-bold transition hover:border-accent/40"
            >
              <span className="grid h-8 w-8 place-items-center rounded-full bg-accentSoft text-xs text-accentDark">{initial}</span>
              <span>{t('profile')}</span>
              <span className="hidden max-w-28 truncate text-muted md:inline">· {user?.displayName}</span>
            </Link>
            <button
              type="button"
              onClick={() => logout.mutate()}
              className="hidden min-h-10 rounded-full px-3 text-sm font-bold text-muted transition hover:bg-red-50 hover:text-red-700 sm:block"
            >
              {t('logout')}
            </button>
          </div>
        </nav>
      </header>

      <nav aria-label={t('menu')} className="fixed inset-x-3 bottom-3 z-30 grid grid-cols-5 rounded-2xl border border-border bg-surface/95 p-1 shadow-xl backdrop-blur lg:hidden">
        {mainLinks.map(([label, to]) => <NavLink key={to} to={to} className={({ isActive }) => `truncate rounded-xl px-1 py-3 text-center text-[11px] font-bold ${isActive ? 'bg-accent text-white' : 'text-muted'}`}>{label}</NavLink>)}
      </nav>

      <main className="mx-auto w-full max-w-7xl px-4 py-8 pb-24 md:px-6 lg:py-10">
        <Outlet />
      </main>
    </div>
  );
}
