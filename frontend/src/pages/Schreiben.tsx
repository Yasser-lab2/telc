import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Icon } from '../components/landing/icons';
import '../components/landing/landing.css';
import { apiClient } from '../lib/api';
import { useI18n } from '../lib/i18n';

export function Schreiben() {
  const { direction, t } = useI18n();
  const types = useQuery({ queryKey: ['schreiben'], queryFn: apiClient.schreiben });
  return (
    <div className="kk-dash" dir={direction}>
      <section className="kk-welcome kk-welcome-col">
        <p className="kk-cap">{t('writingIntro')}</p>
        <h1 className="kk-welcome-title kk-lesen-title serif" dir="ltr">Schreiben</h1>
        <p className="kk-welcome-sub">{t('writingDescription')}</p>
        <div className="kk-row-actions">
          <span className="kk-chip-soft">{t('minutes', { count: 30 })}</span>
          <span className="kk-chip-soft">{t('draftSavedLabel')}</span>
          <span className="kk-chip-soft kk-chip-accent">{t('structuredCorrection')}</span>
        </div>
      </section>

      <div className="kk-sec-head">
        <div><p className="kk-cap">{t('chooseTopic')}</p><h2 className="kk-panel-title serif kk-big">{t('writingToday')}</h2></div>
        <span className="kk-sec-note">{t('topics', { count: types.data?.types.length ?? 0 })}</span>
      </div>
      {types.isLoading && <p className="kk-panel-body">{t('preparingTopics')}</p>}
      {types.isError && <p className="kk-error" role="alert">{t('topicsError')}</p>}
      <section className="kk-exams kk-exams-3">
        {types.data?.types.map((type) => (
          <Link key={type.id} to={`/dashboard/schreiben/${type.id}`} className="kk-exam" dir="ltr">
            <div className="kk-exam-top">
              <span className="kk-badge-s is-ok">{type.niveau}</span>
              <span className="kk-exam-n"><Icon name="pen" size={18} /></span>
            </div>
            <h2 className="kk-exam-title kk-exam-wrap german">{type.title}</h2>
            <p className="kk-panel-body kk-clamp3" dir="ltr">{type.context}</p>
            <span className="kk-open">{t('startWriting')}<Icon name="arrowRight" size={14} className="kk-arrow" /></span>
          </Link>
        ))}
      </section>
    </div>
  );
}
