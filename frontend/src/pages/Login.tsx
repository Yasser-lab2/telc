import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Navbar } from '../components/layout/Navbar';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { useAuth } from '../hooks/useAuth';

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
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
    <div className="min-h-screen bg-bg" dir="ltr">
      <Navbar />
      <main className="mx-auto max-w-md px-4 py-12">
        <Card>
          <h1 className="text-2xl font-bold">Connexion</h1>
          <form className="mt-6 space-y-4" onSubmit={submit}>
            <Input type="email" placeholder="Email" value={email} onChange={(event) => setEmail(event.target.value)} />
            <Input type="password" placeholder="Mot de passe" value={password} onChange={(event) => setPassword(event.target.value)} />
            {login.error && <p className="text-sm text-red-600">{login.error.message}</p>}
            <Button className="w-full" disabled={login.isPending}>Se connecter</Button>
          </form>
          <p className="mt-4 text-sm text-muted">
            Nouveau? <Link className="font-semibold text-accent" to="/register">Créer un compte</Link>
          </p>
        </Card>
      </main>
    </div>
  );
}
