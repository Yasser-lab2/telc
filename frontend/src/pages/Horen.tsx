import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../components/landing/icons';
import '../components/landing/landing.css';
import importedTeil1 from '../data/zertify-horen-teil1.json';
import importedTeil2 from '../data/zertify-horen-teil2.json';
import importedTeil3 from '../data/zertify-horen-teil3.json';
import { useI18n } from '../lib/i18n';

const importedLibraries = { 1: importedTeil1, 2: importedTeil2, 3: importedTeil3 } as const;
type HorenPart = keyof typeof importedLibraries;

export function Horen() {
  const { direction, t } = useI18n();
  const [activePart, setActivePart] = useState<HorenPart>(1);
  const [search, setSearch] = useState('');
  const activeLibrary = importedLibraries[activePart];
  const availableExercises = useMemo(() => activeLibrary.exercises.filter((exercise) => Boolean(exercise.audioUrl)), [activeLibrary]);
  const imported = useMemo(
    () => availableExercises.filter((exercise) => exercise.title.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())),
    [availableExercises, search],
  );
  const parts = [
    { id: 1, label: 'Teil 1', description: t('partOneDescription') },
    { id: 2, label: 'Teil 2', description: t('partTwoDescription') },
    { id: 3, label: 'Teil 3', description: t('partThreeDescription') },
  ] as const;

  return (
    <div className="kk-dash" dir={direction}>
      <section className="kk-welcome kk-welcome-col">
        <p className="kk-cap">{t('listeningIntro')}</p>
        <h1 className="kk-welcome-title kk-lesen-title serif" dir="ltr">Hörverstehen</h1>
        <p className="kk-welcome-sub">{t('listeningDescription')}</p>
      </section>

      <section className="kk-panel">
        <div className="kk-tabs kk-tabs-grid" role="tablist" aria-label="Hören">
          {parts.map((part) => (
            <button key={part.id} type="button" role="tab" aria-selected={activePart === part.id} className={activePart === part.id ? 'is-on' : undefined} dir="ltr" onClick={() => setActivePart(part.id)}>
              <span className="german">{part.label}</span>
              <span className="kk-tab-sub" dir={direction}>{part.description}</span>
            </button>
          ))}
        </div>
      </section>

      <div className="kk-sec-head">
        <div dir="ltr">
          <h2 className="kk-panel-title serif kk-big">Hören · Teil {activePart}</h2>
          <p className="kk-panel-body"><bdi dir="ltr">{t('exercisesWithAudio', { count: availableExercises.length })}</bdi></p>
        </div>
        <div className="kk-search kk-search-narrow">
          <Icon name="search" size={18} />
          <input type="search" className="kk-input" aria-label={t('searchExercise')} value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t('searchExercise')} />
        </div>
      </div>

      <section className="kk-exams kk-exams-3">
        {imported.map((exercise, index) => (
          <Link key={exercise.id} to={`/dashboard/horen/imported/teil${activePart}/${exercise.id}`} className="kk-exam" dir="ltr">
            <div className="kk-exam-top">
              <span className="kk-exam-n mono">{String(index + 1).padStart(2, '0')}</span>
              <span className="kk-badge-s is-ok">{t('readyAudio')}</span>
            </div>
            <h3 className="kk-exam-title german">{exercise.title}</h3>
            <p className="kk-panel-body"><bdi dir="ltr">{t('statementsAnswered', { answered: exercise.statements.length, total: exercise.statements.length })}</bdi>{exercise.duration && <> · <bdi dir="ltr">{exercise.duration}</bdi></>}</p>
            <span className="kk-open"><Icon name="headphones" size={14} />Hören<Icon name="arrowRight" size={14} className="kk-arrow" /></span>
          </Link>
        ))}
        {imported.length === 0 && <p className="kk-panel-body">{t('noAudioExercises')}</p>}
      </section>
    </div>
  );
}
