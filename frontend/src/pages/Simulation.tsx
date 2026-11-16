import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../components/landing/landing.css';
import { apiClient, type SimulationSession } from '../lib/api';
import { formatDate } from '../lib/utils';
import { useI18n } from '../lib/i18n';

export function Simulation() {
  const { direction, locale, t } = useI18n();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [now, setNow] = useState(Date.now());
  const catalog = useQuery({ queryKey: ['simulations'], queryFn: apiClient.simulations });
  const active = useQuery({ queryKey: ['simulation-active'], queryFn: apiClient.activeSimulation });
  const history = useQuery({ queryKey: ['simulation-history'], queryFn: apiClient.simulationHistory });
  const schedules = useQuery({ queryKey: ['simulation-schedules'], queryFn: apiClient.simulationSchedules });
  const [scheduleFor, setScheduleFor] = useState<string | null>(null);
  const [scheduledAt, setScheduledAt] = useState('');
  const schedule = useMutation({ mutationFn: apiClient.scheduleSimulation, onSuccess: () => { setScheduleFor(null); setScheduledAt(''); queryClient.invalidateQueries({ queryKey: ['simulation-schedules'] }); } });
  const cancelSchedule = useMutation({ mutationFn: apiClient.cancelSimulationSchedule, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['simulation-schedules'] }) });
  const start = useMutation({ mutationFn: apiClient.startSimulation, onSuccess: (data) => queryClient.setQueryData(['simulation-active'], { session: data.session }) });
  const startModule = useMutation({ mutationFn: ({ sessionId, moduleId }: { sessionId: string; moduleId: string }) => apiClient.startSimulationModule(sessionId, moduleId), onSuccess: (data) => navigate(data.launchPath) });
  const completeModule = useMutation({
    mutationFn: ({ sessionId, moduleId }: { sessionId: string; moduleId: string }) => apiClient.completeSimulationModule(sessionId, moduleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['simulation-active'] });
      queryClient.invalidateQueries({ queryKey: ['simulation-history'] });
      queryClient.invalidateQueries({ queryKey: ['progress'] });
    },
  });

  useEffect(() => { const interval = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(interval); }, []);
  const session = active.data?.session;
  const errorMessage = start.error?.message ?? startModule.error?.message ?? completeModule.error?.message ?? schedule.error?.message;
  const dateFormat = new Intl.DateTimeFormat(locale === 'ar' ? 'ar-MA' : locale === 'en' ? 'en-MA' : 'fr-FR', { dateStyle: 'medium', timeStyle: 'short' });

  return (
    <div className="kk-dash" dir={direction}>
      <section className="kk-welcome kk-welcome-col">
        <p className="kk-cap">{t('simulationPhase')}</p>
        <h1 className="kk-welcome-title kk-lesen-title kk-title-md serif">{t('simulationTitle')}</h1>
        <p className="kk-welcome-sub">{t('simulationDescription')}</p>
      </section>

      {session?.status === 'in_progress' ? (
        <ActiveSimulation
          session={session}
          now={now}
          pending={startModule.isPending || completeModule.isPending}
          onStart={(moduleId) => startModule.mutate({ sessionId: session.id, moduleId })}
          onComplete={(moduleId) => completeModule.mutate({ sessionId: session.id, moduleId })}
        />
      ) : (
        <section className="kk-panel">
          <h2 className="kk-panel-title serif kk-big">{t('availableSimulations')}</h2>
          <div className="kk-sims">
            {catalog.data?.simulations.map((simulation) => (
              <article key={simulation.id} className="kk-q">
                <div className="kk-q-top">
                  <h3 className="kk-q-text" dir="ltr">{simulation.title}</h3>
                  <span className="kk-badge-s is-ok">{simulation.level}</span>
                </div>
                <p className="kk-panel-note kk-mt">{t('minutes', { count: simulation.durationMinutes })} · <span dir="ltr">{t('simulationSkills')}</span></p>
                {simulation.instructions && <p className="kk-panel-body kk-mt" dir="ltr">{simulation.instructions}</p>}
                <button
                  type="button"
                  className="kk-cta kk-cta-inline kk-mt"
                  disabled={start.isPending}
                  onClick={() => { if (window.confirm(t('startTimedSimulation', { count: simulation.durationMinutes }))) start.mutate(simulation.id); }}
                >
                  {t('startSimulation')}
                </button>
              </article>
            ))}
          </div>
          {catalog.data && !catalog.data.simulations.length && <p className="kk-notice kk-notice-neutral">{t('noPublishedSimulation')}</p>}
        </section>
      )}

      {schedules.data?.schedules.length ? (
        <section className="kk-panel">
          <h2 className="kk-panel-title serif">{t('scheduled')}</h2>
          <div className="kk-qlist">
            {schedules.data.schedules.map((item) => (
              <div key={item.id} className="kk-hist">
                <span><strong dir="ltr">{item.title}</strong> · {dateFormat.format(new Date(item.scheduledAt))}</span>
                <button type="button" className="kk-text-btn" onClick={() => cancelSchedule.mutate(item.id)}>{t('cancel')}</button>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {!session && catalog.data?.simulations.length ? (
        <section className="kk-panel">
          <h2 className="kk-panel-title serif">{t('scheduleSimulationTitle')}</h2>
          <div className="kk-schedule">
            <select aria-label={t('chooseSimulation')} className="kk-input kk-select" value={scheduleFor ?? ''} onChange={(event) => setScheduleFor(event.target.value || null)}>
              <option value="">{t('chooseSimulation')}</option>
              {catalog.data.simulations.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
            </select>
            <input aria-label={t('scheduleSimulationTitle')} className="kk-input" type="datetime-local" value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)} />
            <button type="button" className="kk-ghost-btn" disabled={!scheduleFor || !scheduledAt || schedule.isPending} onClick={() => schedule.mutate({ simulationId: scheduleFor!, scheduledAt: new Date(scheduledAt).toISOString() })}>{t('scheduleButton')}</button>
          </div>
        </section>
      ) : null}

      {errorMessage && <p className="kk-error" role="alert">{errorMessage}</p>}

      <section className="kk-panel">
        <h2 className="kk-panel-title serif">{t('historyTitle')}</h2>
        <div className="kk-qlist">
          {history.data?.history.map((item) => (
            <div key={item.id} className="kk-hist">
              <div>
                <p className="kk-hist-title" dir="ltr">{item.title} · {item.level}</p>
                <p className="kk-panel-note">{formatDate(item.startedAt, locale)} · {simulationStatusLabel(item.status, t)}</p>
              </div>
              <strong>{item.percentage == null ? '—' : `${Math.round(item.percentage)}%`}</strong>
            </div>
          ))}
          {history.data && !history.data.history.length && <p className="kk-panel-body">{t('noPreviousSimulations')}</p>}
        </div>
      </section>
    </div>
  );
}

function simulationStatusLabel(status: string, t: (key: string) => string) {
  return ({ completed: t('finished'), in_progress: t('simulationInProgress'), pending: t('pendingStatus'), cancelled: t('cancelledStatus') } as Record<string, string>)[status] ?? status.replace(/_/g, ' ');
}

function ActiveSimulation({ session, now, pending, onStart, onComplete }: { session: SimulationSession; now: number; pending: boolean; onStart: (id: string) => void; onComplete: (id: string) => void }) {
  const { t } = useI18n();
  const skillLabels = { reading: t('reading'), listening: t('listening'), writing: t('writing') };
  const remaining = Math.max(0, Math.floor((new Date(session.expiresAt).getTime() - now) / 1000));
  const hours = Math.floor(remaining / 3600);
  const minutes = Math.floor((remaining % 3600) / 60);
  const seconds = remaining % 60;
  return (
    <section className="kk-panel kk-sim-active">
      <div className="kk-panel-head">
        <div>
          <p className="kk-cap">{t('simulationInProgress')}</p>
          <h2 className="kk-panel-title serif kk-big" dir="ltr">{session.title}</h2>
        </div>
        <div className={remaining < 600 ? 'kk-timer is-low' : 'kk-timer'}>
          <p className="kk-cap">{t('timeRemaining')}</p>
          <p className="kk-timer-v mono">{hours.toString().padStart(2, '0')}:{minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}</p>
        </div>
      </div>
      <ol className="kk-qlist kk-modlist">
        {session.modules.map((module) => (
          <li key={module.id} className="kk-q kk-mod">
            <div>
              <p className="kk-q-text"><span dir="ltr">{module.orderIndex + 1}. {skillLabels[module.skill]} · {module.title}</span></p>
              <p className="kk-panel-note">{t('minutes', { count: module.durationMinutes })} · {module.resultStatus === 'locked' ? t('locked') : module.resultStatus === 'available' ? t('ready') : module.resultStatus === 'in_progress' ? t('toFinish') : `${t('finished')} · ${Math.round(module.percentage ?? 0)}%`}</p>
            </div>
            {module.resultStatus === 'available' && <button type="button" className="kk-cta kk-cta-inline" disabled={pending || remaining === 0} onClick={() => onStart(module.id)}>{t('start')}</button>}
            {module.resultStatus === 'in_progress' && (
              <div className="kk-row-actions">
                <button type="button" className="kk-ghost-btn" disabled={pending} onClick={() => onStart(module.id)}>{t('resume')}</button>
                <button type="button" className="kk-cta kk-cta-inline" disabled={pending} onClick={() => onComplete(module.id)}>{t('validateModule')}</button>
              </div>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
