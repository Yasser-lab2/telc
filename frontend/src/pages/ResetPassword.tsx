import { useMutation } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Navbar } from '../components/layout/Navbar';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { apiClient } from '../lib/api';

export function ResetPassword() {
  const [params] = useSearchParams(); const token = params.get('token') ?? '';
  const [password, setPassword] = useState('');
  const reset = useMutation({ mutationFn: () => apiClient.resetPassword(token, password) });
  function submit(event: FormEvent) { event.preventDefault(); reset.mutate(); }
  return <div className="app-canvas min-h-screen"><Navbar /><main className="mx-auto max-w-md px-4 py-16"><Card><h1 className="text-3xl font-black">Nouveau mot de passe</h1>{reset.isSuccess ? <div className="mt-6"><p className="text-sm text-muted">Votre mot de passe a été modifié et les anciennes sessions ont été fermées.</p><Link className="mt-4 inline-flex font-bold text-accent" to="/login">Se connecter</Link></div> : <form className="mt-6 space-y-4" onSubmit={submit}><label className="text-sm font-bold">Mot de passe<Input className="mt-2" type="password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} /></label>{!token && <p className="text-sm text-red-600">Le lien ne contient aucun jeton.</p>}{reset.error && <p className="text-sm text-red-600">{reset.error.message}</p>}<Button className="w-full" disabled={!token || reset.isPending}>Modifier le mot de passe</Button></form>}</Card></main></div>;
}
