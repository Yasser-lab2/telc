import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Icon, type IconName } from '../components/landing/icons';
import '../components/landing/landing.css';
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
  const goalDone = learning.data?.studyGoal.completed ?? 0;
  const goalTarget = learning.data?.studyGoal.weeklyTarget ?? 3;
  const recommendation = learning.data?.recommendations[0];
  const readiness = learning.data?.readiness;
  const skills: Array<{ title: string; label: string; route: string; icon: IconName }> = [
    { title: 'Lesen', label: t('readingTitle'), route: '/dashboard/lesen', icon: 'book' },
    { title: 'Hören', label: t('listeningTitle'), route: '/dashboard/horen', icon: 'headphones' },
    { title: 'Schreiben', label: t('writingAssistantTitle'), route: '/dashboard/schreiben', icon: 'pen' },
    { title: 'Sprechen', label: t('speakingPractice'), route: '/dashboard/speaking', icon: 'mic' },
    { title: 'Simulation', label: t('simulationTitle'), route: '/dashboard/simulation', icon: 'timer' },
  ];

  return (
    <div className="kk-dash" dir={direction}>
      <section className="kk-welcome">
        <div>
          <p className="kk-cap">{t('dashboardGreeting')}</p>
          <h1 className="kk-welcome-title serif">{t('dashboardGreeting')}, <span className="kk-hl">{user?.displayName}</span></h1>
          <p className="kk-welcome-sub">{t('yourLevel')}: {level}. {t('homeDescription')}</p>
        </div>
        <Link to="/dashboard/lesen" className="kk-cta">{t('startTraining')}<Icon name="arrowRight" size={18} className="kk-arrow" /></Link>
      </section>

      <section aria-label={t('dashboardSummary')} className="kk-stats4">
        <Stat label={t('streakDays')} value={`${streak} ${streak === 1 ? t('day') : t('days')}`} hint={streak ? t('keepGoing') : t('firstSession')} />
        <Stat label={t('yourLevel')} value={level} hint={t('changeInProfile')} />
        <Stat label={t('aiCorrections')} value={remaining} hint={t('renewsDaily')} />
        <Stat label={t('plan')} value={planName} hint={t('validUntil', { date: expiry })} small />
      </section>

      <section className="kk-two">
        <div className="kk-panel">
          <div className="kk-panel-head">
            <div><p className="kk-cap">{t('yourConsistency')}</p><h2 className="kk-panel-title serif">{t('last12Weeks')}</h2></div>
            <span className="kk-chip-soft">{t('realSessionsOnly')}</span>
          </div>
          <ActivityHeatmap activityDates={activityDates} ariaLabel={t('yourConsistency')} />
          <div className="kk-legend"><span>{t('less')}</span><div aria-hidden="true"><i className="h0" /><i className="h1" /><i className="h2" /></div><span>{t('more')}</span></div>
        </div>

        <div className="kk-panel kk-panel-between">
          <div>
            <p className="kk-cap">{t('homeAssistant')}</p>
            <h2 className="kk-panel-title serif kk-big">{t('writingAssistantTitle')}</h2>
            <p className="kk-panel-body">{t('writingAssistantBody')}</p>
          </div>
          <Link to="/dashboard/schreiben" className="kk-ghost-btn">{t('tryCorrection')}<Icon name="arrowRight" size={16} className="kk-arrow" /></Link>
        </div>
      </section>

      <section>
        <div className="kk-sec-head">
          <div><p className="kk-cap">{t('skills')}</p><h2 className="kk-panel-title serif kk-big">{t('whatToPractice')}</h2></div>
          <span className="kk-sec-note">{t('fiveWays')}</span>
        </div>
        <div className="kk-skills5">
          {skills.map((skill) => (
            <Link key={skill.title} to={skill.route} className="kk-skill2">
              <span className="kk-skill2-ico"><Icon name={skill.icon} size={20} /></span>
              <div className="kk-skill2-text">
                <h3 className="german" dir="ltr">{skill.title}</h3>
                <p>{skill.label}</p>
              </div>
              <span className="kk-open">{t('openSkill')}<Icon name="arrowRight" size={14} className="kk-arrow" /></span>
            </Link>
          ))}
        </div>
      </section>

      <section className="kk-two kk-two-even">
        <div className="kk-col">
          <div className="kk-panel">
            <div className="kk-panel-head">
              <div><p className="kk-cap">{t('weeklyGoal')}</p><h2 className="kk-panel-title serif kk-big">{t('weeklyGoalText', { completed: goalDone, target: goalTarget })}</h2></div>
              <select aria-label={t('weeklyGoal')} className="kk-input kk-select kk-mini-select" value={goalTarget} onChange={(event) => updateGoal.mutate(Number(event.target.value))}>
                {[1, 2, 3, 4, 5, 6, 7, 10, 14].map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
            </div>
            <Progress value={Math.min(100, (goalDone / goalTarget) * 100)} label={t('weeklyGoal')} />
            <p className="kk-panel-note">{t('weeklyGoalHelp')}</p>
          </div>

          <div className="kk-panel">
            <h2 className="kk-panel-title serif">{t('recurringMistakes')}</h2>
            {learning.data?.mistakes.length ? (
              <div className="kk-mistakes">
                {learning.data.mistakes.map((item) => (
                  <div key={item.id} className={item.status === 'reviewed' ? 'kk-mistake is-done' : 'kk-mistake'}>
                    <div className="kk-mistake-top">
                      <p dir="ltr">{item.prompt}</p>
                      <button type="button" className="kk-text-btn" onClick={() => reviewMistake.mutate({ id: item.id, reviewed: item.status !== 'reviewed' })}>{item.status === 'reviewed' ? t('restoreMistake') : t('markReviewed')}</button>
                    </div>
                    <p className="kk-mistake-meta"><span>{t('yourAnswer')}:</span> <span dir="ltr">{item.selectedAnswer ?? '—'}</span> · <span>{t('correctAnswer')}:</span> <span dir="ltr">{item.correctAnswer ?? '—'}</span> · {t('occurrences', { count: item.occurrenceCount })}</p>
                    {item.explanation && <p className="kk-mistake-exp" dir="ltr">{item.explanation}</p>}
                  </div>
                ))}
              </div>
            ) : <p className="kk-panel-body">{t('noSavedMistakes')}</p>}
            <span className="kk-chip-soft kk-chip-left">{t('toReview', { count: openMistakes })}</span>
          </div>
        </div>

        <div className="kk-col">
          <div className="kk-panel">
            <p className="kk-cap">{t('nextStepTitle')}</p>
            {recommendation ? (
              <>
                <h2 className="kk-panel-title serif kk-big" dir="ltr">{recommendation.title}</h2>
                <p className="kk-panel-body" dir="ltr">{recommendation.reason}</p>
                <div className="kk-row-actions">
                  <Link className="kk-ghost-btn kk-ghost-sm" to={recommendation.route}>{t('start')}<Icon name="arrowRight" size={14} className="kk-arrow" /></Link>
                  <button type="button" className="kk-text-btn" onClick={() => dismissRecommendation.mutate(recommendation.id)}>{t('hide')}</button>
                </div>
              </>
            ) : <p className="kk-panel-body">{t('finishFirstExercise')}</p>}
          </div>

          <div className="kk-panel">
            <p className="kk-cap">{t('examReadinessTitle')}</p>
            <p className="kk-score serif">{readiness?.score == null ? t('readinessPending') : `${Math.round(readiness.score)}%`}</p>
            <p className="kk-panel-body" dir="ltr">{readiness?.explanation ?? t('finishFirstExercise')}</p>
            {readiness?.score != null && <Progress value={Math.max(0, Math.min(100, readiness.score))} label={t('examReadinessTitle')} />}
            <div className="kk-readiness-foot">
              <span>{readiness?.confidence === 'reliable' ? t('reliableEstimate') : t('preliminaryEstimate')} · {t('resultsCount', { count: readiness?.evidenceAttempts ?? 0 })}</span>
              <Link to="/dashboard/simulation" className="kk-open">{t('seeSimulation')}<Icon name="arrowRight" size={14} className="kk-arrow" /></Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value, hint, small }: { label: string; value: string; hint: string; small?: boolean }) {
  return (
    <div className="kk-stat">
      <p className="kk-cap">{label}</p>
      <p className={small ? 'kk-stat-value serif kk-stat-small' : 'kk-stat-value serif'}>{value}</p>
      <p className="kk-stat-hint">{hint}</p>
    </div>
  );
}

function Progress({ value, label }: { value: number; label: string }) {
  const done = value >= 100;
  return (
    <div className="kk-progress" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value)}>
      <div className={done ? 'kk-progress-fill is-done' : 'kk-progress-fill'} style={{ width: `${value}%` }} />
    </div>
  );
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
  const todayKey = dateKey(new Date().toISOString());
  const days = Array.from({ length: 84 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (83 - index));
    const key = dateKey(date.toISOString());
    return { key, active: activityDates.has(key), today: key === todayKey };
  });
  return (
    <div className="kk-heat-wrap">
      <div className="kk-heat" role="img" aria-label={ariaLabel}>
        {days.map((day) => <span key={day.key} title={day.key} className={day.today ? 'is-today' : day.active ? 'is-on' : undefined} />)}
      </div>
    </div>
  );
}
