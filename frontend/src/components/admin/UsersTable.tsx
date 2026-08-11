import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { apiClient } from '../../lib/api';
import { formatDate } from '../../lib/utils';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { useAuth } from '../../hooks/useAuth';
import type { AppRole } from '../../lib/api';

export function UsersTable() {
  const { user: actor } = useAuth();
  const canManageUsers = Boolean(actor?.permissions.includes('users.manage'));
  const canManageSubscriptions = Boolean(actor?.permissions.includes('subscriptions.manage'));
  const queryClient = useQueryClient();
  const [input, setInput] = useState('');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const users = useQuery({ queryKey: ['admin-users', query], queryFn: () => apiClient.adminUsers(query) });
  const detail = useQuery({ queryKey: ['admin-user', selectedId], queryFn: () => apiClient.adminUserDetail(selectedId!), enabled: Boolean(selectedId) });
  const refresh = () => { queryClient.invalidateQueries({ queryKey: ['admin-users'] }); queryClient.invalidateQueries({ queryKey: ['admin-user', selectedId] }); queryClient.invalidateQueries({ queryKey: ['admin-stats'] }); };
  const update = useMutation({ mutationFn: ({ id, payload }: { id: string; payload: Parameters<typeof apiClient.updateAdminUser>[1] }) => apiClient.updateAdminUser(id, payload), onSuccess: refresh });
  const extend = useMutation({ mutationFn: ({ id, days }: { id: string; days: number }) => apiClient.extendAdminSubscription(id, days), onSuccess: refresh });
  const cancel = useMutation({ mutationFn: apiClient.cancelAdminSubscription, onSuccess: refresh });
  function search(event: FormEvent) { event.preventDefault(); setQuery(input.trim()); }

  return <div className="space-y-6"><Card><div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between"><div><h2 className="text-xl font-black">Utilisateurs</h2><p className="mt-1 text-sm text-muted">Rechercher, consulter l’activité et gérer les accès.</p></div><form onSubmit={search} className="flex w-full gap-2 md:max-w-md"><Input value={input} onChange={(event) => setInput(event.target.value)} placeholder="Nom ou e-mail" /><Button>Rechercher</Button></form></div>
    <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[820px] text-left text-sm"><thead className="text-muted"><tr><th className="py-2">Utilisateur</th><th>Rôle</th><th>Niveau</th><th>Abonnement</th><th>Tentatives</th><th>Dernière visite</th><th></th></tr></thead><tbody>{users.data?.users.map((user) => <tr key={user.id} className="border-t border-border"><td className="py-3"><p className="font-bold">{user.displayName}</p><p className="text-xs text-muted">{user.email}</p></td><td>{user.role}</td><td>{user.niveau}</td><td>{user.subscription ? <span>{user.subscription.planName} · {user.subscription.status}</span> : <span className="text-muted">Aucun</span>}</td><td>{user.completedAttempts}</td><td>{user.lastSeenAt ? formatDate(user.lastSeenAt) : '—'}</td><td><Button variant="secondary" onClick={() => setSelectedId(user.id)}>Gérer</Button></td></tr>)}</tbody></table></div></Card>
    {detail.data && <Card><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[0.14em] text-accent">Fiche utilisateur</p><h2 className="mt-2 text-2xl font-black">{detail.data.user.displayName}</h2><p className="mt-1 text-sm text-muted">{detail.data.user.email}</p></div><Button variant="secondary" onClick={() => setSelectedId(null)}>Fermer</Button></div>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {canManageUsers ? <label className="text-sm font-bold">Niveau<select className="field mt-2" value={detail.data.user.niveau} onChange={(event) => update.mutate({ id: detail.data.user.id, payload: { niveau: event.target.value as 'B1' | 'B2' | 'B1_B2' } })}><option>B1</option><option>B2</option><option value="B1_B2">B1 + B2</option></select></label> : <div><p className="text-sm font-bold">Niveau</p><p className="mt-2 text-sm">{detail.data.user.niveau}</p></div>}
        {canManageUsers ? <label className="text-sm font-bold">Rôle<select className="field mt-2" value={detail.data.user.role} onChange={(event) => { if (confirm('Confirmer le changement de rôle ?')) update.mutate({ id: detail.data.user.id, payload: { role: event.target.value as AppRole } }); }}><option value="student">Student</option><option value="support">Support</option><option value="content_editor">Content editor</option><option value="admin">Admin</option></select></label> : <div><p className="text-sm font-bold">Rôle</p><p className="mt-2 text-sm">{detail.data.user.role}</p></div>}
        {canManageSubscriptions && <div><p className="text-sm font-bold">Accès</p><div className="mt-2 flex gap-2"><Button onClick={() => { const value = prompt('Nombre de jours à ajouter', '30'); const days = Number(value); if (Number.isInteger(days) && days > 0) extend.mutate({ id: detail.data.user.id, days }); }}>Prolonger</Button><Button variant="danger" onClick={() => { if (confirm('Annuler les abonnements actifs ?')) cancel.mutate(detail.data.user.id); }}>Annuler</Button></div></div>}
      </div>
      {(update.error || extend.error || cancel.error) && <p className="mt-4 text-sm text-red-600">{update.error?.message ?? extend.error?.message ?? cancel.error?.message}</p>}
      <div className="mt-7 grid gap-5 lg:grid-cols-2"><section><h3 className="font-black">Progression</h3><div className="mt-3 space-y-2">{detail.data.progress.length ? detail.data.progress.map((item) => <div key={item.id} className="flex justify-between rounded-xl bg-bg p-3 text-sm"><span className="capitalize">{item.skill} · {item.level}</span><strong>{Math.round(item.averagePercentage ?? 0)}% · {item.completedAttempts}</strong></div>) : <p className="text-sm text-muted">Aucune tentative terminée.</p>}</div></section><section><h3 className="font-black">Abonnements</h3><div className="mt-3 space-y-2">{detail.data.subscriptions.length ? detail.data.subscriptions.map(({ subscription, plan }) => <div key={subscription.id} className="rounded-xl bg-bg p-3 text-sm"><strong>{plan.name}</strong><p className="mt-1 text-muted">{subscription.status} · expire {formatDate(subscription.expiresAt)}</p></div>) : <p className="text-sm text-muted">Aucun abonnement.</p>}</div></section></div>
      <section className="mt-7"><h3 className="font-black">Activité récente</h3><div className="mt-3 space-y-2">{detail.data.recentActivity.length ? detail.data.recentActivity.map((item) => <div key={item.id} className="flex justify-between rounded-xl border border-border p-3 text-sm"><span>{item.title} <span className="capitalize text-muted">· {item.skill}</span></span><strong>{Math.round(item.percentage ?? 0)}%</strong></div>) : <p className="text-sm text-muted">Aucune activité.</p>}</div></section>
    </Card>}</div>;
}
