import { useMutation } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Navbar } from '../components/layout/Navbar';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { apiClient } from '../lib/api';
import { useI18n } from '../lib/i18n';

export function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [password, setPassword] = useState('');
  const { direction, t } = useI18n();
  const reset = useMutation({ mutationFn: () => apiClient.resetPassword(token, password) });
  function submit(event: FormEvent) { event.preventDefault(); reset.mutate(); }
  return (
    <div className="app-canvas min-h-screen" dir={direction}>
      <Navbar />
      <main className="mx-auto max-w-md px-4 py-16">
        <Card>
          <h1 className="text-3xl font-black">{t('resetPassword')}</h1>
          {reset.isSuccess ? (
            <div className="mt-6">
              <p className="text-sm text-muted">{t('passwordChanged')}</p>
              <Link className="mt-4 inline-flex font-bold text-accent" to="/login">{t('signInButton')}</Link>
            </div>
          ) : (
            <form className="mt-6 space-y-4" onSubmit={submit}>
              <label className="text-sm font-bold">{t('password')}<Input className="mt-2" type="password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
              {!token && <p className="text-sm text-red-600">{t('invalidToken')}</p>}
              {reset.error && <p className="text-sm text-red-600">{reset.error.message}</p>}
              <Button className="w-full" disabled={!token || reset.isPending}>{reset.isPending ? t('saving') : t('changePassword')}</Button>
            </form>
          )}
        </Card>
      </main>
    </div>
  );
}
