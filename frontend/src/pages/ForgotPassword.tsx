import { useMutation } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Navbar } from '../components/layout/Navbar';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { apiClient } from '../lib/api';

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const request = useMutation({ mutationFn: apiClient.forgotPassword });
  function submit(event: FormEvent) { event.preventDefault(); request.mutate(email); }
  return <div className="app-canvas min-h-screen"><Navbar /><main className="mx-auto max-w-md px-4 py-16"><Card><p className="text-xs font-black uppercase tracking-[0.16em] text-accent">Sécurité du compte</p><h1 className="mt-3 text-3xl font-black">Mot de passe oublié</h1><p className="mt-2 text-sm leading-6 text-muted">Saisissez votre adresse. La réponse reste identique même si aucun compte ne correspond.</p>{request.data ? <div className="mt-6 rounded-xl bg-accentSoft p-4 text-sm"><p>{request.data.message}</p>{request.data.devResetUrl && <a className="mt-3 block font-bold text-accent" href={request.data.devResetUrl}>Ouvrir le lien local de réinitialisation</a>}</div> : <form className="mt-6 space-y-4" onSubmit={submit}><label className="text-sm font-bold">Adresse e-mail<Input className="mt-2" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>{request.error && <p className="text-sm text-red-600">{request.error.message}</p>}<Button className="w-full" disabled={request.isPending}>Envoyer le lien</Button></form>}<Link className="mt-5 block text-sm font-bold text-accent" to="/login">Retour à la connexion</Link></Card></main></div>;
}
