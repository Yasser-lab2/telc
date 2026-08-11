import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { Navbar } from '../components/layout/Navbar';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { useAuth } from '../hooks/useAuth';

export function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ displayName: '', email: '', password: '', niveau: 'B1', acceptTerms: false });

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!form.acceptTerms) return;
    register.mutate({ ...form, acceptTerms: true }, { onSuccess: () => navigate('/dashboard') });
  }

  return (
    <div className="app-canvas min-h-screen" dir="ltr">
      <Navbar />
      <main className="mx-auto max-w-md px-4 py-16">
        <Card className="p-7 md:p-8">
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-accent">Essai gratuit</p>
          <h1 className="mt-3 text-3xl font-black text-ink">Créer un compte</h1>
          <p className="mt-2 text-sm leading-6 text-muted">Votre essai de 24 heures sera activé automatiquement.</p>
          <form className="mt-7 space-y-5" onSubmit={submit}>
            <label className="block text-sm font-bold text-ink">Nom complet<Input className="mt-2" required autoComplete="name" placeholder="Votre nom" value={form.displayName} onChange={(event) => setForm({ ...form, displayName: event.target.value })} /></label>
            <label className="block text-sm font-bold text-ink">Adresse e-mail<Input className="mt-2" required autoComplete="email" type="email" placeholder="vous@exemple.com" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
            <label className="block text-sm font-bold text-ink">Mot de passe<Input className="mt-2" required minLength={8} autoComplete="new-password" type="password" placeholder="8 caractères minimum" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /></label>
            <label className="block text-sm font-bold text-ink">Niveau préparé
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
              <span>J’accepte les <Link className="font-bold text-accent underline" to="/legal/terms" target="_blank">conditions d’utilisation</Link> et reconnais avoir lu la <Link className="font-bold text-accent underline" to="/legal/privacy" target="_blank">politique de confidentialité</Link>.</span>
            </label>
            {register.error && <p className="text-sm text-red-600">{register.error.message}</p>}
            <Button className="w-full" disabled={register.isPending || !form.acceptTerms}>{register.isPending ? 'Création…' : 'Commencer'}</Button>
          </form>
        </Card>
      </main>
    </div>
  );
}
