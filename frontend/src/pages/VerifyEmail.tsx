import { useMutation } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AuthLayout } from '../components/landing/AuthLayout';
import { apiClient } from '../lib/api';
import { useI18n } from '../lib/i18n';

export function VerifyEmail() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const started = useRef(false);
  const { t } = useI18n();
  const verify = useMutation({ mutationFn: () => apiClient.confirmEmail(token) });
  useEffect(() => { if (token && !started.current) { started.current = true; verify.mutate(); } }, [token]);
  const failed = !verify.isPending && !verify.isSuccess;
  const message = verify.isPending ? t('verifying') : verify.isSuccess ? t('emailVerifiedShort') : verify.error ? verify.error.message : t('invalidLink');
  return (
    <AuthLayout eyebrow={t('accountSecurity')} title={t('verifyEmailTitle')}>
      {failed
        ? <p className="kk-error" role="alert">{message}</p>
        : <div className={verify.isSuccess ? 'kk-notice' : 'kk-notice kk-notice-neutral'} role="status"><p>{message}</p>{verify.isSuccess && <Link className="kk-auth-link" to="/dashboard">{t('continue')}</Link>}</div>}
      <p className="kk-auth-foot"><Link style={{ marginInlineStart: 0 }} to="/login">{t('backToLogin')}</Link></p>
    </AuthLayout>
  );
}
