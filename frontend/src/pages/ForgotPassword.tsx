import { useMutation } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { AuthLayout } from '../components/landing/AuthLayout';
import { apiClient } from '../lib/api';
import { useI18n } from '../lib/i18n';

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const { t } = useI18n();
  const request = useMutation({ mutationFn: apiClient.forgotPassword });
  function submit(event: FormEvent) { event.preventDefault(); request.mutate(email); }
  return (
    <AuthLayout eyebrow={t('accountSecurity')} title={t('forgotPasswordTitle')} subtitle={t('forgotPasswordHelp')}>
      {request.data ? (
        <div className="kk-notice" role="status">
          <p>{request.data.message}</p>
          {request.data.devResetUrl && <a className="kk-auth-link" href={request.data.devResetUrl}>{t('devResetLink')}</a>}
        </div>
      ) : (
        <form onSubmit={submit}>
          <div className="kk-field">
            <label className="kk-label" htmlFor="forgot-email">{t('email')}</label>
            <input id="forgot-email" className="kk-input" type="email" required autoComplete="email" placeholder={t('emailPlaceholder')} value={email} aria-invalid={request.error ? true : undefined} onChange={(event) => setEmail(event.target.value)} />
          </div>
          {request.error && <p className="kk-error" role="alert">{request.error.message}</p>}
          <button type="submit" className="kk-submit" disabled={request.isPending}>{request.isPending ? t('sending') : t('sendLink')}</button>
        </form>
      )}
      <p className="kk-auth-foot"><Link style={{ marginInlineStart: 0 }} to="/login">{t('backToLogin')}</Link></p>
    </AuthLayout>
  );
}
