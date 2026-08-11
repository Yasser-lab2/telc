import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { PendingPayments } from '../components/admin/PendingPayments';
import { ReadingExamManager } from '../components/admin/ReadingExamManager';
import { LearningContentManager } from '../components/admin/LearningContentManager';
import { UsersTable } from '../components/admin/UsersTable';
import { Navbar } from '../components/layout/Navbar';
import { Card } from '../components/ui/Card';
import { apiClient } from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import { SimulationManager } from '../components/admin/SimulationManager';

function MetricGroup({ title, items }: { title: string; items: Array<[string, string | number]> }) {
  return <section><h2 className="mb-3 text-sm font-black uppercase tracking-[0.14em] text-muted">{title}</h2><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{items.map(([label, value]) => <Card key={label} className="p-4"><p className="text-xs font-bold text-muted">{label}</p><p className="mt-2 text-2xl font-black">{value}</p></Card>)}</div></section>;
}

export function Admin() {
  const { user } = useAuth();
  const [tab, setTab] = useState<'payments' | 'reading' | 'content' | 'simulations'>('payments');
  const can = (permission: NonNullable<typeof user>['permissions'][number]) => Boolean(user?.permissions.includes(permission));
  const tabs = [can('payments.review') || can('users.view') ? 'payments' : null, can('content.manage') ? 'reading' : null, can('content.manage') ? 'content' : null, can('content.manage') ? 'simulations' : null].filter(Boolean) as Array<'payments' | 'reading' | 'content' | 'simulations'>;
  const activeTab = tabs.includes(tab) ? tab : tabs[0];
  const stats = useQuery({ queryKey: ['admin-stats'], queryFn: apiClient.adminStats, enabled: can('analytics.view') });
  const metrics = stats.data;

  return (
    <div className="min-h-screen bg-bg" dir="ltr">
      <Navbar />
      <main id="main-content" tabIndex={-1} className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-3xl font-bold">Admin</h1>
        {can('analytics.view') && <div className="mt-6 space-y-6">
          {stats.isLoading && <Card><p className="text-sm text-muted">Chargement des indicateurs…</p></Card>}
          {stats.error && <Card className="border-red-200"><p className="text-sm text-red-600">{stats.error.message}</p></Card>}
          {metrics && <>
            <MetricGroup title="Audience · 7 jours" items={[["Utilisateurs", metrics.overview.totalUsers], ["Nouveaux comptes", metrics.overview.newUsers7d], ["Apprenants actifs", metrics.overview.activeLearners7d]]} />
            <MetricGroup title="Apprentissage · 7 jours" items={[["Tentatives démarrées", metrics.learning.attemptsStarted7d], ["Tentatives terminées", metrics.learning.attemptsCompleted7d], ["Taux de complétion", `${metrics.learning.completionRate7d}%`], ["Score moyen", `${metrics.learning.averageScore7d}%`]]} />
            <MetricGroup title="Commercial" items={[["Abonnements actifs", metrics.subscriptions.active], ["Essais actifs", metrics.subscriptions.trial], ["Paiements en attente", metrics.payments.pending], ["CA validé · 30 j", `${metrics.payments.revenueMad30d.toLocaleString('fr-MA')} MAD`], ["Paiements approuvés · 30 j", metrics.payments.approved30d], ["Paiements rejetés · 30 j", metrics.payments.rejected30d], ["Délai moyen de revue", `${metrics.payments.averageReviewHours30d} h`], ["Historique expiré", metrics.subscriptions.usersWithExpiredHistory]]} />
            <MetricGroup title="Opérations" items={[["Corrections IA aujourd’hui", metrics.ai.submissionsToday], ["Latence IA moyenne · 7 j", `${metrics.ai.averageLatencyMs7d} ms`], ["Contenus publiés", metrics.content.published], ["Brouillons", metrics.content.drafts]]} />
            <p className="text-right text-xs text-muted">Actualisé le {new Date(metrics.generatedAt).toLocaleString('fr-MA')}</p>
          </>}
        </div>}
        <div className="mt-6 flex gap-2">
          {(can('payments.review') || can('users.view')) && <button
            type="button"
            onClick={() => setTab('payments')}
            className={`rounded-md px-4 py-2 text-sm font-semibold ${activeTab === 'payments' ? 'bg-accent text-white' : 'border border-border bg-surface text-text'}`}
          >
            Payments
          </button>}
          {can('content.manage') && <button
            type="button"
            onClick={() => setTab('reading')}
            className={`rounded-md px-4 py-2 text-sm font-semibold ${activeTab === 'reading' ? 'bg-accent text-white' : 'border border-border bg-surface text-text'}`}
          >
            Lesen Exams
          </button>}
          {can('content.manage') && <button type="button" onClick={() => setTab('content')} className={`rounded-md px-4 py-2 text-sm font-semibold ${activeTab === 'content' ? 'bg-accent text-white' : 'border border-border bg-surface text-text'}`}>
            Hören & Schreiben
          </button>}
          {can('content.manage') && <button type="button" onClick={() => setTab('simulations')} className={`rounded-md px-4 py-2 text-sm font-semibold ${activeTab === 'simulations' ? 'bg-accent text-white' : 'border border-border bg-surface text-text'}`}>Simulations</button>}
        </div>
        <div className="mt-6 space-y-6">
          {activeTab === 'payments' ? (
            <>
              {can('payments.review') && <PendingPayments />}
              {can('users.view') && <UsersTable />}
            </>
          ) : activeTab === 'reading' ? (
            <ReadingExamManager />
          ) : activeTab === 'content' ? <LearningContentManager /> : <SimulationManager />}
        </div>
      </main>
    </div>
  );
}
