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
import { SpeakingManager } from '../components/admin/SpeakingManager';
import { SpeakingReviewQueue } from '../components/admin/SpeakingReviewQueue';
import { useI18n } from '../lib/i18n';
import { formatDateTime, formatMad } from '../lib/utils';

function MetricGroup({ title, items }: { title: string; items: Array<[string, string | number]> }) {
  return <section><h2 className="mb-3 text-sm font-black uppercase tracking-[0.14em] text-muted">{title}</h2><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{items.map(([label, value]) => <Card key={label} className="p-4"><p className="text-xs font-bold text-muted">{label}</p><p className="mt-2 text-2xl font-black">{value}</p></Card>)}</div></section>;
}

export function Admin() {
  const { user } = useAuth();
  const { direction, locale, t } = useI18n();
  const [tab, setTab] = useState<'payments' | 'reading' | 'content' | 'speaking' | 'simulations'>('payments');
  const can = (permission: NonNullable<typeof user>['permissions'][number]) => Boolean(user?.permissions.includes(permission));
  const tabs = [can('payments.review') || can('users.view') ? 'payments' : null, can('content.manage') ? 'reading' : null, can('content.manage') ? 'content' : null, can('content.manage') ? 'speaking' : null, can('content.manage') ? 'simulations' : null].filter(Boolean) as Array<'payments' | 'reading' | 'content' | 'speaking' | 'simulations'>;
  const activeTab = tabs.includes(tab) ? tab : tabs[0];
  const stats = useQuery({ queryKey: ['admin-stats'], queryFn: apiClient.adminStats, enabled: can('analytics.view') });
  const metrics = stats.data;
  return (
    <div className="app-canvas min-h-screen bg-bg" dir={direction}>
      <Navbar />
      <main id="main-content" tabIndex={-1} className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-3xl font-bold">{t('adminTitle')}</h1>
        {can('analytics.view') && <div className="mt-6 space-y-6">
          {stats.isLoading && <Card><p className="text-sm text-muted">{t('metricsLoading')}</p></Card>}
          {stats.error && <Card className="border-red-200"><p className="text-sm text-red-600">{stats.error.message}</p></Card>}
          {metrics && <>
            <MetricGroup title={t('audience7d')} items={[[t('totalUsers'), metrics.overview.totalUsers], [t('newAccounts'), metrics.overview.newUsers7d], [t('activeLearners'), metrics.overview.activeLearners7d]]} />
            <MetricGroup title={t('learning7d')} items={[[t('attemptsStarted'), metrics.learning.attemptsStarted7d], [t('attemptsCompleted'), metrics.learning.attemptsCompleted7d], [t('completionRate'), `${metrics.learning.completionRate7d}%`], [t('averageScore'), `${metrics.learning.averageScore7d}%`]]} />
            <MetricGroup title={t('commercial')} items={[[t('activeSubscriptions'), metrics.subscriptions.active], [t('activeTrials'), metrics.subscriptions.trial], [t('pendingPayments'), metrics.payments.pending], [t('revenue30d'), formatMad(metrics.payments.revenueMad30d, locale)], [t('approvedPayments'), metrics.payments.approved30d], [t('rejectedPayments'), metrics.payments.rejected30d], [t('averageReviewDelay'), `${metrics.payments.averageReviewHours30d} h`], [t('expiredHistory'), metrics.subscriptions.usersWithExpiredHistory]]} />
            <MetricGroup title={t('operations')} items={[[t('aiCorrectionsToday'), metrics.ai.submissionsToday], [t('averageAiLatency'), `${metrics.ai.averageLatencyMs7d} ms`], [t('publishedContent'), metrics.content.published], [t('drafts'), metrics.content.drafts]]} />
            <MetricGroup title={t('controlledGrowth')} items={[[t('referralsAssigned'), metrics.growth.referrals], [t('referralsConverted'), metrics.growth.convertedReferrals], [t('scheduledCount'), metrics.growth.scheduledSimulations], [t('remindersSent'), metrics.growth.remindersSent30d]]} />
            <p className="text-end text-xs text-muted">{t('refreshedAt', { date: formatDateTime(metrics.generatedAt, locale) })}</p>
          </>}
        </div>}
        <div className="mt-6 flex flex-wrap gap-2">
          {(can('payments.review') || can('users.view')) && <button type="button" onClick={() => setTab('payments')} className={`rounded-md px-4 py-2 text-sm font-semibold ${activeTab === 'payments' ? 'bg-accent text-white' : 'border border-border bg-surface text-text'}`}>{t('paymentsTab')}</button>}
          {can('content.manage') && <button type="button" onClick={() => setTab('reading')} className={`rounded-md px-4 py-2 text-sm font-semibold ${activeTab === 'reading' ? 'bg-accent text-white' : 'border border-border bg-surface text-text'}`}>{t('readingExamsTab')}</button>}
          {can('content.manage') && <button type="button" onClick={() => setTab('content')} className={`rounded-md px-4 py-2 text-sm font-semibold ${activeTab === 'content' ? 'bg-accent text-white' : 'border border-border bg-surface text-text'}`}>{t('listeningWritingTab')}</button>}
          {can('content.manage') && <button type="button" onClick={() => setTab('simulations')} className={`rounded-md px-4 py-2 text-sm font-semibold ${activeTab === 'simulations' ? 'bg-accent text-white' : 'border border-border bg-surface text-text'}`}>{t('simulationsTab')}</button>}
          {can('content.manage') && <button type="button" onClick={() => setTab('speaking')} className={`rounded-md px-4 py-2 text-sm font-semibold ${activeTab === 'speaking' ? 'bg-accent text-white' : 'border border-border bg-surface text-text'}`}>{t('speakingTab')}</button>}
        </div>
        <div className="mt-6 space-y-6">
          {activeTab === 'payments' ? <>{can('payments.review') && <PendingPayments />}{can('users.view') && <UsersTable />}</> : activeTab === 'reading' ? <ReadingExamManager /> : activeTab === 'content' ? <LearningContentManager /> : activeTab === 'speaking' ? <><SpeakingReviewQueue /><SpeakingManager /></> : <SimulationManager />}
        </div>
      </main>
    </div>
  );
}
