import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthLayout } from '../components/landing/AuthLayout';
import { useAuth } from '../hooks/useAuth';
import { useI18n } from '../lib/i18n';

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { t } = useI18n();
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
    <AuthLayout active="login" eyebrow={t('loginWelcome')} title={t('login')} subtitle={t('loginDescription')}>
      <form onSubmit={submit}>
        <div className="kk-field">
          <label className="kk-label" htmlFor="login-email">{t('email')}</label>
          <input id="login-email" className="kk-input" required autoComplete="email" type="email" placeholder={t('emailPlaceholder')} value={email} aria-invalid={login.error ? true : undefined} onChange={(event) => setEmail(event.target.value)} />
        </div>
        <div className="kk-field">
          <div className="kk-field-head">
            <label className="kk-label" htmlFor="login-password">{t('password')}</label>
            <Link className="kk-auth-link" to="/forgot-password">{t('forgotPassword')}</Link>
          </div>
          <input id="login-password" className="kk-input" required autoComplete="current-password" type="password" placeholder={t('passwordPlaceholder')} value={password} aria-invalid={login.error ? true : undefined} onChange={(event) => setPassword(event.target.value)} />
        </div>
        {login.error && <p className="kk-error" role="alert">{login.error.message}</p>}
        <button type="submit" className="kk-submit" disabled={login.isPending}>{login.isPending ? `${t('login')}…` : t('signInButton')}</button>
      </form>
      <p className="kk-auth-foot">
        <span>{t('newUser')}</span>
        <Link to="/register">{t('createAccountButton')}</Link>
      </p>
    </AuthLayout>
  );
}
