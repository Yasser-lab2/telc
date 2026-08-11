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

export function Admin() {
  const { user } = useAuth();
  const [tab, setTab] = useState<'payments' | 'reading' | 'content'>('payments');
  const can = (permission: NonNullable<typeof user>['permissions'][number]) => Boolean(user?.permissions.includes(permission));
  const tabs = [can('payments.review') || can('users.view') ? 'payments' : null, can('content.manage') ? 'reading' : null, can('content.manage') ? 'content' : null].filter(Boolean) as Array<'payments' | 'reading' | 'content'>;
  const activeTab = tabs.includes(tab) ? tab : tabs[0];
  const stats = useQuery({ queryKey: ['admin-stats'], queryFn: apiClient.adminStats, enabled: can('analytics.view') });
  const statCards = [
    ['Users', stats.data?.totalUsers ?? 0],
    ['Active', stats.data?.activeSubscriptions ?? 0],
    ['Expired', stats.data?.expiredSubscriptions ?? 0],
    ['Trial', stats.data?.trialSubscriptions ?? 0],
    ['AI today', stats.data?.aiUsageToday ?? 0],
  ];

  return (
    <div className="min-h-screen bg-bg" dir="ltr">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-3xl font-bold">Admin</h1>
        {can('analytics.view') && <div className="mt-6 grid gap-4 md:grid-cols-5">
          {statCards.map(([label, value]) => (
            <Card key={label}>
              <p className="text-sm text-muted">{label}</p>
              <p className="mt-2 text-2xl font-bold">{value}</p>
            </Card>
          ))}
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
        </div>
        <div className="mt-6 space-y-6">
          {activeTab === 'payments' ? (
            <>
              {can('payments.review') && <PendingPayments />}
              {can('users.view') && <UsersTable />}
            </>
          ) : activeTab === 'reading' ? (
            <ReadingExamManager />
          ) : <LearningContentManager />}
        </div>
      </main>
    </div>
  );
}
