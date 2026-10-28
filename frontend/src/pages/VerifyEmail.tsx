import { useMutation } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Navbar } from '../components/layout/Navbar';
import { Card } from '../components/ui/Card';
import { apiClient } from '../lib/api';
import { useI18n } from '../lib/i18n';

export function VerifyEmail() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const started = useRef(false);
  const { direction, t } = useI18n();
  const verify = useMutation({ mutationFn: () => apiClient.confirmEmail(token) });
  useEffect(() => { if (token && !started.current) { started.current = true; verify.mutate(); } }, [token]);
  return (
    <div className="app-canvas min-h-screen" dir={direction}>
      <Navbar />
      <main className="mx-auto max-w-md px-4 py-16">
        <Card>
          <h1 className="text-3xl font-black">{t('verifyEmailTitle')}</h1>
          <p className="mt-4 text-sm text-muted">{verify.isPending ? t('verifying') : verify.isSuccess ? t('emailVerifiedShort') : verify.error ? verify.error.message : t('invalidLink')}</p>
          {verify.isSuccess && <Link className="mt-5 inline-flex font-bold text-accent" to="/dashboard">{t('continue')}</Link>}
        </Card>
      </main>
    </div>
  );
}
