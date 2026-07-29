import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '../components/layout/Navbar';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { useAuth } from '../hooks/useAuth';

export function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ displayName: '', email: '', password: '', niveau: 'B1' });

  function submit(event: FormEvent) {
    event.preventDefault();
    register.mutate(form, { onSuccess: () => navigate('/dashboard') });
  }

  return (
    <div className="min-h-screen bg-bg" dir="ltr">
      <Navbar />
      <main className="mx-auto max-w-md px-4 py-12">
        <Card>
          <h1 className="text-2xl font-bold">Créer un compte</h1>
          <p className="mt-2 text-sm text-muted">Essai gratuit 24h activé automatiquement.</p>
          <form className="mt-6 space-y-4" onSubmit={submit}>
            <Input placeholder="Nom" value={form.displayName} onChange={(event) => setForm({ ...form, displayName: event.target.value })} />
            <Input type="email" placeholder="Email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
            <Input type="password" placeholder="Mot de passe (8+ caractères)" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
            <select
              className="min-h-10 w-full rounded-md border border-border bg-white px-3 text-sm"
              value={form.niveau}
              onChange={(event) => setForm({ ...form, niveau: event.target.value })}
            >
              <option value="B1">B1</option>
              <option value="B2">B2</option>
              <option value="B1_B2">B1 + B2</option>
            </select>
            {register.error && <p className="text-sm text-red-600">{register.error.message}</p>}
            <Button className="w-full" disabled={register.isPending}>Commencer</Button>
          </form>
        </Card>
      </main>
    </div>
  );
}
