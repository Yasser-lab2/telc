import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Navbar } from '../components/layout/Navbar';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { useAuth } from '../hooks/useAuth';
import { useI18n } from '../lib/i18n';

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { direction, t } = useI18n();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  function submit(event: FormEvent) {
    event.preventDefault();
    login.mutate(
      { email, password },
      {
        onSuccess: () => navigate('/dashboard'),
      },
    );
  }

  return (
    <div className="app-canvas min-h-screen" dir={direction}>
      <Navbar />
      <main id="main-content" tabIndex={-1} className="mx-auto max-w-md px-4 py-16">
        <Card className="p-7 md:p-8">
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-accent">{t('loginWelcome')}</p>
          <h1 className="mt-3 text-3xl font-black text-ink">{t('login')}</h1>
          <p className="mt-2 text-sm leading-6 text-muted">{t('loginDescription')}</p>
          <form className="mt-7 space-y-5" onSubmit={submit}>
            <label className="block text-sm font-bold text-ink">{t('email')}<Input className="mt-2" required autoComplete="email" type="email" placeholder={t('emailPlaceholder')} value={email} onChange={(event) => setEmail(event.target.value)} /></label>
            <label className="block text-sm font-bold text-ink">{t('password')}<Input className="mt-2" required autoComplete="current-password" type="password" placeholder={t('passwordPlaceholder')} value={password} onChange={(event) => setPassword(event.target.value)} /></label>
            <Link className="block text-start text-sm font-bold text-accent" to="/forgot-password">{t('forgotPassword')}</Link>
            {login.error && <p className="text-sm text-red-600">{login.error.message}</p>}
            <Button className="w-full" disabled={login.isPending}>{login.isPending ? `${t('login')}…` : t('signInButton')}</Button>
          </form>
          <p className="mt-4 text-sm text-muted">
            {t('newUser')} <Link className="font-semibold text-accent" to="/register">{t('createAccountButton')}</Link>
          </p>
        </Card>
      </main>
    </div>
  );
}
