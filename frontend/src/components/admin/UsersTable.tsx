import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { apiClient } from '../../lib/api';
import { formatDate } from '../../lib/utils';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { useAuth } from '../../hooks/useAuth';
import { useI18n } from '../../lib/i18n';
import type { AppRole } from '../../lib/api';

function roleLabel(role: string, t: (key: string) => string) {
  const key = { student: 'studentRole', support: 'supportRole', content_editor: 'editorRole', admin: 'adminRole' }[role];
  return key ? t(key) : role;
}

function statusLabel(status: string, t: (key: string) => string) {
  const key = { pending: 'pendingStatus', approved: 'approvedStatus', rejected: 'rejectedStatus', cancelled: 'cancelledStatus', active: 'activeStatus', expired: 'expiredStatus' }[status];
  return key ? t(key) : status;
}

function skillLabel(skill: string, t: (key: string) => string) {
  return skill === 'writing' ? t('writing') : skill === 'listening' ? t('listening') : skill === 'reading' ? t('reading') : skill;
}

export function UsersTable() {
  const { user: actor } = useAuth();
  const { direction, locale, t } = useI18n();
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

  return <div className="space-y-6" dir={direction}>
    <Card>
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between"><div><h2 className="text-xl font-black">{t('users')}</h2><p className="mt-1 text-sm text-muted">{t('usersHelp')}</p></div><form onSubmit={search} className="flex w-full gap-2 md:max-w-md"><Input value={input} onChange={(event) => setInput(event.target.value)} placeholder={t('nameOrEmail')} /><Button>{t('search')}</Button></form></div>
      <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[820px] text-start text-sm"><thead className="text-muted"><tr><th className="py-2">{t('users')}</th><th>{t('role')}</th><th>{t('level')}</th><th>{t('subscription')}</th><th>{t('completedAttempts')}</th><th>{t('lastVisit')}</th><th></th></tr></thead><tbody>{users.data?.users.map((item) => <tr key={item.id} className="border-t border-border"><td className="py-3"><p className="font-bold" dir="ltr">{item.displayName}</p><p className="text-xs text-muted" dir="ltr">{item.email}</p></td><td>{roleLabel(item.role, t)}</td><td dir="ltr">{item.niveau}</td><td>{item.subscription ? <span><span dir="ltr">{item.subscription.planName}</span> · {statusLabel(item.subscription.status, t)}</span> : <span className="text-muted">{t('noSubscription')}</span>}</td><td>{item.completedAttempts}</td><td>{item.lastSeenAt ? formatDate(item.lastSeenAt, locale) : '—'}</td><td><Button variant="secondary" onClick={() => setSelectedId(item.id)}>{t('manage')}</Button></td></tr>)}</tbody></table></div>
    </Card>
    {detail.data && <Card>
      <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[0.14em] text-accent">{t('userSheet')}</p><h2 className="mt-2 text-2xl font-black" dir="ltr">{detail.data.user.displayName}</h2><p className="mt-1 text-sm text-muted" dir="ltr">{detail.data.user.email}</p></div><Button variant="secondary" onClick={() => setSelectedId(null)}>{t('close')}</Button></div>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {canManageUsers ? <label className="text-sm font-bold">{t('level')}<select className="field mt-2" value={detail.data.user.niveau} onChange={(event) => update.mutate({ id: detail.data.user.id, payload: { niveau: event.target.value as 'B1' | 'B2' | 'B1_B2' } })}><option>B1</option><option>B2</option><option value="B1_B2">B1 + B2</option></select></label> : <div><p className="text-sm font-bold">{t('level')}</p><p className="mt-2 text-sm" dir="ltr">{detail.data.user.niveau}</p></div>}
        {canManageUsers ? <label className="text-sm font-bold">{t('role')}<select className="field mt-2" value={detail.data.user.role} onChange={(event) => { if (window.confirm(t('confirmRoleChange'))) update.mutate({ id: detail.data.user.id, payload: { role: event.target.value as AppRole } }); }}><option value="student">{t('studentRole')}</option><option value="support">{t('supportRole')}</option><option value="content_editor">{t('editorRole')}</option><option value="admin">{t('adminRole')}</option></select></label> : <div><p className="text-sm font-bold">{t('role')}</p><p className="mt-2 text-sm">{roleLabel(detail.data.user.role, t)}</p></div>}
        {canManageSubscriptions && <div><p className="text-sm font-bold">{t('manageAccess')}</p><div className="mt-2 flex gap-2"><Button onClick={() => { const value = window.prompt(t('extendDays'), '30'); const days = Number(value); if (Number.isInteger(days) && days > 0) extend.mutate({ id: detail.data.user.id, days }); }}>{t('extend')}</Button><Button variant="danger" onClick={() => { if (window.confirm(t('cancelActiveQuestion'))) cancel.mutate(detail.data.user.id); }}>{t('cancelAccess')}</Button></div></div>}
      </div>
      {(update.error || extend.error || cancel.error) && <p className="mt-4 text-sm text-red-600">{update.error?.message ?? extend.error?.message ?? cancel.error?.message}</p>}
      <div className="mt-7 grid gap-5 lg:grid-cols-2"><section><h3 className="font-black">{t('progression')}</h3><div className="mt-3 space-y-2">{detail.data.progress.length ? detail.data.progress.map((item) => <div key={item.id} className="flex justify-between rounded-xl bg-bg p-3 text-sm"><span dir="ltr">{skillLabel(item.skill, t)} · {item.level}</span><strong>{Math.round(item.averagePercentage ?? 0)}% · {item.completedAttempts}</strong></div>) : <p className="text-sm text-muted">{t('noCompletedAttempts')}</p>}</div></section><section><h3 className="font-black">{t('subscriptions')}</h3><div className="mt-3 space-y-2">{detail.data.subscriptions.length ? detail.data.subscriptions.map(({ subscription: item, plan }) => <div key={item.id} className="rounded-xl bg-bg p-3 text-sm"><strong dir="ltr">{plan.name}</strong><p className="mt-1 text-muted">{statusLabel(item.status, t)} · {t('expiresOn', { date: formatDate(item.expiresAt, locale) })}</p></div>) : <p className="text-sm text-muted">{t('noSubscriptions')}</p>}</div></section></div>
      <section className="mt-7"><h3 className="font-black">{t('recentActivity')}</h3><div className="mt-3 space-y-2">{detail.data.recentActivity.length ? detail.data.recentActivity.map((item) => <div key={item.id} className="flex justify-between rounded-xl border border-border p-3 text-sm"><span dir="ltr">{item.title} <span className="text-muted">· {skillLabel(item.skill, t)}</span></span><strong>{Math.round(item.percentage ?? 0)}%</strong></div>) : <p className="text-sm text-muted">{t('noActivity')}</p>}</div></section>
    </Card>}
  </div>;
}
