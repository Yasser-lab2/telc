import { useMutation } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AuthLayout } from '../components/landing/AuthLayout';
import { apiClient } from '../lib/api';
import { useI18n } from '../lib/i18n';

export function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [password, setPassword] = useState('');
  const { t } = useI18n();
  const reset = useMutation({ mutationFn: () => apiClient.resetPassword(token, password) });
  function submit(event: FormEvent) { event.preventDefault(); reset.mutate(); }
  return (
    <AuthLayout eyebrow={t('accountSecurity')} title={t('resetPassword')}>
      {reset.isSuccess ? (
        <div className="kk-notice" role="status">
          <p>{t('passwordChanged')}</p>
          <Link className="kk-auth-link" to="/login">{t('signInButton')}</Link>
        </div>
      ) : (
        <form onSubmit={submit}>
          <div className="kk-field">
            <label className="kk-label" htmlFor="reset-password">{t('password')}</label>
            <input id="reset-password" className="kk-input" type="password" minLength={8} required autoComplete="new-password" placeholder={t('passwordMin')} value={password} aria-invalid={reset.error ? true : undefined} onChange={(event) => setPassword(event.target.value)} />
          </div>
          {!token && <p className="kk-error" role="alert">{t('invalidToken')}</p>}
          {reset.error && <p className="kk-error" role="alert">{reset.error.message}</p>}
          <button type="submit" className="kk-submit" disabled={!token || reset.isPending}>{reset.isPending ? t('saving') : t('changePassword')}</button>
        </form>
      )}
      <p className="kk-auth-foot"><Link style={{ marginInlineStart: 0 }} to="/login">{t('backToLogin')}</Link></p>
    </AuthLayout>
  );
}
