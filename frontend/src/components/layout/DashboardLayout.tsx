import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const mainLinks = [
  ['Lesen', '/dashboard/lesen'],
  ['Horen', '/dashboard/horen'],
  ['Schreiben', '/dashboard/schreiben'],
  ['Simulation', '/dashboard/simulation'],
];

function CircleButton({ label, children }: { label: string; children: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-sm text-slate-300 shadow-sm transition hover:border-teal-300/40 hover:bg-teal-300/10 hover:text-white"
    >
      {children}
    </button>
  );
}

export function DashboardLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const initial = user?.displayName?.charAt(0).toUpperCase() ?? user?.email?.charAt(0).toUpperCase() ?? 'U';

  return (
    <div className="dashboard-grid min-h-screen bg-[#070a12] text-slate-100" dir="ltr">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#070a12]/90 backdrop-blur-xl">
        <nav className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-4 md:px-6 lg:flex-row lg:items-center lg:justify-between">
          <Link to="/dashboard" className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl border border-teal-300/30 bg-teal-300/10 text-xl font-black text-teal-200 shadow-[0_0_30px_rgba(1,105,111,0.35)]">
              T
            </span>
            <span>
              <span className="block text-base font-black leading-tight text-white">TELC Prep</span>
              <span className="block text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">B1 / B2</span>
            </span>
          </Link>

          <div className="flex w-full flex-wrap items-center justify-start gap-2 rounded-full border border-white/10 bg-white/[0.04] p-1 shadow-2xl shadow-black/20 lg:w-auto lg:justify-center">
            {mainLinks.map(([label, to]) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  // Explicit startsWith keeps parent items highlighted on detail routes such as /dashboard/lesen/:themeId.
                  `rounded-full px-4 py-2 text-sm font-semibold transition ${
                    isActive || location.pathname.startsWith(`${to}/`)
                      ? 'bg-white text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:bg-white/10 hover:text-white'
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <CircleButton label="Theme">T</CircleButton>
            <CircleButton label="Parametres">S</CircleButton>
            <CircleButton label="Notifications">!</CircleButton>
            <Link
              to="/dashboard/profile"
              className="flex min-h-10 items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] py-1 pl-1 pr-4 text-sm font-semibold text-slate-200 transition hover:border-teal-300/40 hover:bg-teal-300/10"
            >
              <span className="grid h-8 w-8 place-items-center rounded-full bg-slate-700 text-xs text-white">{initial}</span>
              <span className="max-w-28 truncate">{user?.displayName ?? 'Profil'}</span>
            </Link>
            <button
              type="button"
              onClick={() => logout.mutate()}
              className="min-h-10 rounded-full border border-white/10 px-4 text-sm font-semibold text-slate-300 transition hover:border-red-300/40 hover:bg-red-400/10 hover:text-white"
            >
              Logout
            </button>
          </div>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 py-8 md:px-6 lg:py-10">
        <Outlet />
      </main>
    </div>
  );
}
