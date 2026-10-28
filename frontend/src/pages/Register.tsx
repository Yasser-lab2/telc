import { FormEvent, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { Navbar } from '../components/layout/Navbar';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { useAuth } from '../hooks/useAuth';
import { useI18n } from '../lib/i18n';

export function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { direction, t } = useI18n();
  const [form, setForm] = useState({ displayName: '', email: '', password: '', niveau: 'B1', acceptTerms: false });

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!form.acceptTerms) return;
    register.mutate({ ...form, acceptTerms: true, referralCode: searchParams.get('ref') ?? undefined }, { onSuccess: () => navigate('/dashboard') });
  }

  return (
    <div className="app-canvas min-h-screen" dir={direction}>
      <Navbar />
      <main id="main-content" tabIndex={-1} className="mx-auto max-w-md px-4 py-16">
        <Card className="p-7 md:p-8">
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-accent">{t('freeTrial')}</p>
          <h1 className="mt-3 text-3xl font-black text-ink">{t('createAccount')}</h1>
          <p className="mt-2 text-sm leading-6 text-muted">{t('trialDescription')}</p>
          <form className="mt-7 space-y-5" onSubmit={submit}>
            <label className="block text-sm font-bold text-ink">{t('fullName')}<Input className="mt-2" required autoComplete="name" placeholder={t('fullName')} value={form.displayName} onChange={(event) => setForm({ ...form, displayName: event.target.value })} /></label>
            <label className="block text-sm font-bold text-ink">{t('email')}<Input className="mt-2" required autoComplete="email" type="email" placeholder={t('emailPlaceholder')} value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
            <label className="block text-sm font-bold text-ink">{t('password')}<Input className="mt-2" required minLength={8} autoComplete="new-password" type="password" placeholder={t('passwordMin')} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /></label>
            <label className="block text-sm font-bold text-ink">{t('preparedLevel')}
            <select
              className="mt-2 min-h-11 w-full rounded-xl border border-border bg-white px-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
              value={form.niveau}
              onChange={(event) => setForm({ ...form, niveau: event.target.value })}
            >
              <option value="B1">B1</option>
              <option value="B2">B2</option>
              <option value="B1_B2">B1 + B2</option>
            </select>
            </label>
            <label className="flex items-start gap-3 rounded-xl border border-border bg-white p-4 text-sm text-muted">
              <input className="mt-1 h-4 w-4 shrink-0 accent-accent" required type="checkbox" checked={form.acceptTerms} onChange={(event) => setForm({ ...form, acceptTerms: event.target.checked })} />
              <span>{t('acceptTerms')} <Link className="font-bold text-accent underline" to="/legal/terms" target="_blank">{t('terms')}</Link> · <Link className="font-bold text-accent underline" to="/legal/privacy" target="_blank">{t('privacy')}</Link>.</span>
            </label>
            {register.error && <p className="text-sm text-red-600">{register.error.message}</p>}
            <Button className="w-full" disabled={register.isPending || !form.acceptTerms}>{register.isPending ? `${t('createAccount')}…` : t('start')}</Button>
          </form>
        </Card>
      </main>
    </div>
  );
}
