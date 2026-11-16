import { FormEvent, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AuthLayout } from '../components/landing/AuthLayout';
import { useAuth } from '../hooks/useAuth';
import { useI18n } from '../lib/i18n';

export function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useI18n();
  const [form, setForm] = useState({ displayName: '', email: '', password: '', niveau: 'B1', acceptTerms: false });
  const invalid = register.error ? true : undefined;

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!form.acceptTerms) return;
    register.mutate({ ...form, acceptTerms: true, referralCode: searchParams.get('ref') ?? undefined }, { onSuccess: () => navigate('/dashboard') });
  }

  return (
    <AuthLayout active="register" eyebrow={t('freeTrial')} title={t('createAccount')} subtitle={t('trialDescription')}>
      <form onSubmit={submit}>
        <div className="kk-field">
          <label className="kk-label" htmlFor="reg-name">{t('fullName')}</label>
          <input id="reg-name" className="kk-input" required autoComplete="name" placeholder={t('fullName')} value={form.displayName} onChange={(event) => setForm({ ...form, displayName: event.target.value })} />
        </div>
        <div className="kk-field">
          <label className="kk-label" htmlFor="reg-email">{t('email')}</label>
          <input id="reg-email" className="kk-input" required autoComplete="email" type="email" placeholder={t('emailPlaceholder')} value={form.email} aria-invalid={invalid} onChange={(event) => setForm({ ...form, email: event.target.value })} />
        </div>
        <div className="kk-field">
          <label className="kk-label" htmlFor="reg-password">{t('password')}</label>
          <input id="reg-password" className="kk-input" required minLength={8} autoComplete="new-password" type="password" placeholder={t('passwordMin')} value={form.password} aria-invalid={invalid} onChange={(event) => setForm({ ...form, password: event.target.value })} />
        </div>
        <div className="kk-field">
          <label className="kk-label" htmlFor="reg-level">{t('preparedLevel')}</label>
          <select id="reg-level" className="kk-input kk-select" value={form.niveau} onChange={(event) => setForm({ ...form, niveau: event.target.value })}>
            <option value="B1">B1</option>
            <option value="B2">B2</option>
            <option value="B1_B2">B1 + B2</option>
          </select>
        </div>
        <label className="kk-check">
          <input required type="checkbox" checked={form.acceptTerms} onChange={(event) => setForm({ ...form, acceptTerms: event.target.checked })} />
          <span>{t('acceptTerms')} <Link className="kk-auth-link" to="/legal/terms" target="_blank">{t('terms')}</Link> · <Link className="kk-auth-link" to="/legal/privacy" target="_blank">{t('privacy')}</Link>.</span>
        </label>
        {register.error && <p className="kk-error" role="alert">{register.error.message}</p>}
        <button type="submit" className="kk-submit" disabled={register.isPending || !form.acceptTerms}>{register.isPending ? `${t('createAccount')}…` : t('start')}</button>
      </form>
      <p className="kk-auth-foot">
        <span>{t('alreadyHaveAccount')}</span>
        <Link to="/login">{t('login')}</Link>
      </p>
    </AuthLayout>
  );
}
