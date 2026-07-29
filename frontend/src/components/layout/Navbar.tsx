import { Link, NavLink } from 'react-router-dom';
import { Button } from '../ui/Button';
import { useAuth } from '../../hooks/useAuth';

export function Navbar() {
  const { user, logout } = useAuth();
  return (
    <header className="border-b border-border bg-bg/95">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link to="/" className="text-lg font-bold text-accent">
          TELC Prep
        </Link>
        <div className="flex items-center gap-2 text-sm">
          <NavLink to="/pricing" className="px-2 py-1 text-muted hover:text-text">
            Tarifs
          </NavLink>
          {user ? (
            <>
              <NavLink to="/dashboard" className="px-2 py-1 text-muted hover:text-text">
                Dashboard
              </NavLink>
              {user.role === 'admin' && (
                <NavLink to="/admin" className="px-2 py-1 text-muted hover:text-text">
                  Admin
                </NavLink>
              )}
              <Button variant="secondary" onClick={() => logout.mutate()}>
                Déconnexion
              </Button>
            </>
          ) : (
            <>
              <NavLink to="/login" className="px-2 py-1 text-muted hover:text-text">
                Connexion
              </NavLink>
              <Link to="/register">
                <Button>Créer un compte</Button>
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
