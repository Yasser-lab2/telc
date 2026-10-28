import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useUsage } from '../hooks/useUsage';
import { apiClient, hasActiveSubscription } from '../lib/api';
import { formatDate } from '../lib/utils';
import { useI18n } from '../lib/i18n';

export function Dashboard() {
  const { user, subscription } = useAuth();
  const { direction, locale, t } = useI18n();
  const usage = useUsage();
  const learning = useQuery({ queryKey: ['progress'], queryFn: apiClient.progress });
  const queryClient = useQueryClient();
  const refreshProgress = () => queryClient.invalidateQueries({ queryKey: ['progress'] });
  const updateGoal = useMutation({ mutationFn: apiClient.updateStudyGoal, onSuccess: refreshProgress });
  const reviewMistake = useMutation({ mutationFn: apiClient.reviewMistake, onSuccess: refreshProgress });
  const dismissRecommendation = useMutation({ mutationFn: apiClient.dismissRecommendation, onSuccess: refreshProgress });
  const level = user?.niveau?.replace('_', ' + ') ?? 'B1';
  const activeSubscription = hasActiveSubscription(subscription) ? subscription : null;
  const planName = activeSubscription?.planName ?? t('freeTrial');
  const expiry = activeSubscription ? formatDate(activeSubscription.expiresAt, locale) : '—';
  const remaining = usage.data ? `${usage.data.remaining}/${usage.data.limit}` : '…';
  const activityDates = new Set((learning.data?.recentActivity ?? []).map((item) => dateKey(item.occurredAt)));
  const streak = calculateStreak(activityDates);
  const openMistakes = learning.data?.mistakes.filter((item) => item.status === 'open').length ?? 0;
  const skills = [
    { title: 'Lesen', label: t('readingTitle'), route: '/dashboard/lesen', icon: '↗' },
    { title: 'Hören', label: t('listeningTitle'), route: '/dashboard/horen', icon: '◉' },
    { title: 'Schreiben', label: t('writingAssistantTitle'), route: '/dashboard/schreiben', icon: '✎' },
    { title: 'Sprechen', label: t('speakingPractice'), route: '/dashboard/speaking', icon: '◌' },
    { title: 'Simulation', label: t('simulationTitle'), route: '/dashboard/simulation', icon: '⌁' },
  ];

  return (
    <div className="dashboard-home space-y-7" dir={direction}>
      <section className="grid gap-6 rounded-[28px] border border-indigo-300/15 bg-gradient-to-l from-indigo-400/[0.16] via-[#12182b] to-[#10141d] p-6 shadow-2xl shadow-black/25 md:p-8 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-200">{t('dashboardGreeting')}</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-white md:text-5xl">{t('dashboardGreeting')}, {user?.displayName} 👋</h1>
          <p className="mt-3 max-w-2xl text-base leading-8 text-slate-300">{t('yourLevel')}: {level}. {t('homeDescription')}</p>
        </div>
        <Link to="/dashboard/lesen" className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-indigo-400 px-6 text-sm font-black text-white shadow-lg shadow-indigo-950/30 transition hover:bg-indigo-300">
          {t('startTraining')} ←
        </Link>
      </section>

      <section aria-label={t('dashboardSummary')} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label={t('streakDays')} value={`${streak} ${streak === 1 ? t('day') : t('days')}`} hint={streak ? t('keepGoing') : t('firstSession')} tone="amber" />
        <SummaryCard label={t('yourLevel')} value={level} hint={t('changeInProfile')} tone="indigo" />
        <SummaryCard label={t('aiCorrections')} value={remaining} hint={t('renewsDaily')} tone="cyan" />
        <SummaryCard label={t('plan')} value={planName} hint={t('validUntil', { date: expiry })} tone="emerald" />
      </section>

      <section className="grid gap-5 lg:grid-cols-[1fr_0.72fr]">
        <div className="rounded-[24px] border border-white/10 bg-[#10141d]/90 p-5 shadow-xl shadow-black/20 md:p-6">
          <div className="flex items-start justify-between gap-4">
            <div><p className="text-xs font-black uppercase tracking-[0.18em] text-indigo-200">{t('yourConsistency')}</p><h2 className="mt-2 text-xl font-black text-white">{t('last12Weeks')}</h2></div>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-bold text-slate-400">{t('realSessionsOnly')}</span>
          </div>
          <ActivityHeatmap activityDates={activityDates} ariaLabel={t('yourConsistency')} />
          <div className="mt-4 flex items-center justify-between text-xs text-slate-500"><span>{t('less')}</span><div className="flex gap-1" aria-hidden="true">{[0, 1, 2, 3].map((level) => <span key={level} className={`h-3 w-3 rounded-sm heat-${level}`} />)}</div><span>{t('more')}</span></div>
        </div>

        <div className="rounded-[24px] border border-cyan-300/15 bg-gradient-to-br from-cyan-300/[0.1] to-[#10141d] p-5 shadow-xl shadow-black/20 md:p-6">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-200">{t('homeAssistant')}</p>
          <h2 className="mt-3 text-2xl font-black text-white">{t('writingAssistantTitle')}</h2>
          <p className="mt-3 text-sm leading-7 text-slate-300">{t('writingAssistantBody')}</p>
          <Link to="/dashboard/schreiben" className="mt-5 inline-flex min-h-11 items-center rounded-2xl border border-cyan-300/30 bg-cyan-300/10 px-5 text-sm font-black text-cyan-100 transition hover:bg-cyan-300/20">{t('tryCorrection')} ←</Link>
        </div>
      </section>

      <section>
         <div className="flex items-end justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-indigo-200">{t('skills')}</p><h2 className="mt-2 text-2xl font-black text-white">{t('whatToPractice')}</h2></div><span className="text-sm text-slate-500">{t('fiveWays')}</span></div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {skills.map((skill) => (
            <Link key={skill.title} to={skill.route} className="group rounded-[22px] border border-white/10 bg-[#12151d]/90 p-5 shadow-xl shadow-black/20 transition hover:-translate-y-1 hover:border-indigo-300/30 hover:bg-[#151b26]">
              <span className="grid h-11 w-11 place-items-center rounded-2xl border border-indigo-300/20 bg-indigo-400/10 text-xl font-black text-indigo-200">{skill.icon}</span>
              <h3 className="german mt-5 text-xl font-black text-white" dir="ltr">{skill.title}</h3>
              <p className="mt-2 min-h-10 text-start text-sm leading-6 text-slate-400">{skill.label}</p>
              <span className="mt-4 inline-flex text-sm font-black text-indigo-200 transition group-hover:text-white">{t('openSkill')} ←</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-[24px] border border-white/10 bg-[#10141d]/90 p-5 shadow-xl shadow-black/20 md:p-6">
          <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-indigo-200">{t('weeklyGoal')}</p><h2 className="mt-2 text-xl font-black text-white">{t('weeklyGoalText', { completed: learning.data?.studyGoal.completed ?? 0, target: learning.data?.studyGoal.weeklyTarget ?? 3 })}</h2></div><select aria-label={t('weeklyGoal')} className="field max-w-24" value={learning.data?.studyGoal.weeklyTarget ?? 3} onChange={(event) => updateGoal.mutate(Number(event.target.value))}>{[1, 2, 3, 4, 5, 6, 7, 10, 14].map((value) => <option key={value} value={value}>{value}</option>)}</select></div>
          <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-l from-indigo-400 to-cyan-300" style={{ width: `${Math.min(100, ((learning.data?.studyGoal.completed ?? 0) / (learning.data?.studyGoal.weeklyTarget ?? 3)) * 100)}%` }} /></div>
          <p className="mt-3 text-sm leading-6 text-slate-400">{t('weeklyGoalHelp')}</p>
        </div>
        <div className="rounded-[24px] border border-indigo-300/15 bg-gradient-to-br from-indigo-400/[0.14] to-[#10141d] p-5 shadow-xl shadow-black/20 md:p-6"><p className="text-xs font-black uppercase tracking-[0.18em] text-indigo-200">{t('nextStepTitle')}</p>{learning.data?.recommendations[0] ? <><h2 className="mt-2 text-xl font-black text-white" dir="ltr">{learning.data.recommendations[0].title}</h2><p className="mt-2 text-sm leading-6 text-slate-300" dir="ltr">{learning.data.recommendations[0].reason}</p><div className="mt-4 flex gap-4"><Link className="font-black text-indigo-200" to={learning.data.recommendations[0].route}>{t('start')} ←</Link><button className="text-sm font-bold text-slate-500" onClick={() => dismissRecommendation.mutate(learning.data!.recommendations[0].id)}>{t('hide')}</button></div></> : <p className="mt-3 text-sm leading-6 text-slate-400">{t('finishFirstExercise')}</p>}</div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[1fr_0.85fr]">
         <div className="rounded-[24px] border border-white/10 bg-[#10141d]/90 p-5 shadow-xl shadow-black/20 md:p-6"><h2 className="text-xl font-black text-white">{t('recurringMistakes')}</h2>{learning.data?.mistakes.length ? <div className="mt-4 max-h-80 space-y-3 overflow-y-auto">{learning.data.mistakes.map((item) => <div key={item.id} className={`rounded-2xl border p-4 ${item.status === 'reviewed' ? 'border-white/10 bg-white/[0.03] opacity-60' : 'border-amber-300/20 bg-amber-300/[0.06]'}`}><div className="flex justify-between gap-3"><p className="text-sm font-bold text-white" dir="ltr">{item.prompt}</p><button className="shrink-0 text-xs font-black text-indigo-200" onClick={() => reviewMistake.mutate({ id: item.id, reviewed: item.status !== 'reviewed' })}>{item.status === 'reviewed' ? t('restoreMistake') : t('markReviewed')}</button></div><p className="mt-2 text-xs text-slate-400"><span>{t('yourAnswer')}:</span> <span dir="ltr">{item.selectedAnswer ?? '—'}</span> · <span>{t('correctAnswer')}:</span> <span dir="ltr">{item.correctAnswer ?? '—'}</span> · {t('occurrences', { count: item.occurrenceCount })}</p>{item.explanation && <p className="mt-2 text-xs leading-5 text-slate-300" dir="ltr">{item.explanation}</p>}</div>)}</div> : <p className="mt-4 text-sm leading-6 text-slate-400">{t('noSavedMistakes')}</p>}<p className="mt-4 text-xs font-bold text-slate-500">{t('toReview', { count: openMistakes })}</p></div>
         <Link to="/dashboard/simulation" className="rounded-[24px] border border-white/10 bg-[#080d1b] p-6 text-white shadow-xl shadow-black/25 transition hover:-translate-y-0.5 hover:border-cyan-300/25"><p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-200">{t('examReadinessTitle')}</p><h2 className="mt-3 text-2xl font-black">{learning.data?.readiness.score == null ? t('readinessPending') : `${Math.round(learning.data.readiness.score)}%`}</h2><p className="mt-3 text-sm leading-7 text-slate-300" dir="ltr">{learning.data?.readiness.explanation ?? t('finishFirstExercise')}</p>{learning.data?.readiness.score != null && <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-gradient-to-l from-cyan-300 to-indigo-400" style={{ width: `${Math.max(0, Math.min(100, learning.data.readiness.score))}%` }} /></div>}<p className="mt-4 text-xs font-bold text-slate-400">{learning.data?.readiness.confidence === 'reliable' ? t('reliableEstimate') : t('preliminaryEstimate')} · {t('resultsCount', { count: learning.data?.readiness.evidenceAttempts ?? 0 })}</p><span className="mt-5 inline-flex text-sm font-black text-cyan-200">{t('seeSimulation')} ←</span></Link>
      </section>
    </div>
  );
}

function SummaryCard({ label, value, hint, tone }: { label: string; value: string; hint: string; tone: 'amber' | 'indigo' | 'cyan' | 'emerald' }) {
  return <div className="rounded-[22px] border border-white/10 bg-[#12151d]/90 p-5 shadow-xl shadow-black/15"><span className={`inline-block h-2 w-8 rounded-full tone-${tone}`} /><p className="mt-3 text-xs font-black uppercase tracking-[0.14em] text-slate-500">{label}</p><p className="mt-2 truncate text-2xl font-black text-white">{value}</p><p className="mt-2 truncate text-xs text-slate-400">{hint}</p></div>;
}

function dateKey(value: string) {
  return new Date(value).toISOString().slice(0, 10);
}

function calculateStreak(activityDates: Set<string>) {
  let streak = 0;
  const cursor = new Date();
  while (activityDates.has(dateKey(cursor.toISOString()))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function ActivityHeatmap({ activityDates, ariaLabel }: { activityDates: Set<string>; ariaLabel: string }) {
  const days = Array.from({ length: 84 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (83 - index));
    const key = dateKey(date.toISOString());
    return { key, active: activityDates.has(key) };
  });
  return <div className="mt-6 grid grid-cols-12 gap-1.5" aria-label={ariaLabel}>{days.map((day) => <span key={day.key} title={day.key} className={`h-4 rounded-sm ${day.active ? 'heat-3' : 'heat-0'}`} />)}</div>;
}
