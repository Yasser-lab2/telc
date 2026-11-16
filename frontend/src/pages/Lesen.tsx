import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Icon } from '../components/landing/icons';
import '../components/landing/landing.css';
import { apiClient, type ReadingExamListItem } from '../lib/api';
import { useI18n } from '../lib/i18n';

const categories = [
  { label: 'Prüfungen', section: 'all', descriptionKey: 'allPartsDescription' },
  { label: 'Teil 1', section: 'teil1', descriptionKey: 'teil1Description' },
  { label: 'Teil 2', section: 'teil2', descriptionKey: 'teil2Description' },
  { label: 'Teil 3', section: 'teil3', descriptionKey: 'teil3Description' },
  { label: 'Sprach 1', section: 'sprach1', descriptionKey: 'sprach1Description' },
  { label: 'Sprach 2', section: 'sprach2', descriptionKey: 'sprach2Description' },
] as const;

type ReadingLevel = 'B1' | 'B2';
type SortMode = 'default' | 'az' | 'za';
type Section = (typeof categories)[number]['section'];

function displayReadingTitle(title: string) {
  return title.replace(/^Prüfung\s+\d+\s*[–-]\s*/i, '').trim();
}

const sectionLabels: Record<Exclude<Section, 'all'>, string> = {
  teil1: 'Teil 1',
  teil2: 'Teil 2',
  teil3: 'Teil 3',
  sprach1: 'Sprach 1',
  sprach2: 'Sprach 2',
};

export function Lesen() {
  const { direction, t } = useI18n();
  const navigate = useNavigate();
  const exams = useQuery({ queryKey: ['reading-exams'], queryFn: apiClient.readingExams });
  const [section, setSection] = useState<Section>('all');
  const [level, setLevel] = useState<ReadingLevel>('B2');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortMode>('default');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      return JSON.parse(window.localStorage.getItem('lesen:favorites') ?? '[]') as string[];
    } catch {
      return [];
    }
  });

  const allExams = exams.data?.exams ?? [];
  const toggleFavorite = (id: string) => {
    setFavorites((current) => {
      const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
      window.localStorage.setItem('lesen:favorites', JSON.stringify(next));
      return next;
    });
  };

  const categoryCount = (category: Section) => allExams.filter((exam) => {
    if (exam.level !== level) return false;
    return category === 'all' ? Boolean(exam.isComplete) : exam.sectionCodes.includes(category);
  }).length;

  const visibleExams = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase();
    const filtered = allExams.filter((exam) => {
      const isComplete = exam.isComplete ?? exam.sectionCodes.length === 5;
      const matchesLevel = exam.level === level;
      // A complete model is intentionally listed in every Teil tab, like the reference catalogue.
      const matchesCategory = section === 'all' ? isComplete : exam.sectionCodes.includes(section);
      const matchesSearch = [exam.title, exam.titleAr ?? ''].some((value) => value.toLocaleLowerCase().includes(normalizedSearch));
      const matchesFavorite = !favoritesOnly || favorites.includes(exam.id);
      return matchesLevel && matchesCategory && matchesSearch && matchesFavorite;
    });
    return [...filtered].sort((left, right) => {
      if (sort === 'az') return left.title.localeCompare(right.title, 'de');
      if (sort === 'za') return right.title.localeCompare(left.title, 'de');
      return (left.createdAt ?? '').localeCompare(right.createdAt ?? '') || left.title.localeCompare(right.title, 'de');
    });
  }, [allExams, favorites, favoritesOnly, level, search, section, sort]);

  const randomExam = visibleExams.find((exam) => exam.isComplete) ?? allExams.find((exam) => exam.level === level && exam.isComplete);
  const count = visibleExams.length;
  const openRandom = () => randomExam && navigate(`/dashboard/lesen/${randomExam.id}${section !== 'all' ? `?section=${section}` : ''}`);

  return (
    <div className="kk-dash" dir={direction}>
      <section className="kk-two kk-lesen-hero">
        <div className="kk-welcome kk-welcome-col">
          <span className="kk-chip-soft">{t('practiceSpace')} · {t('freeAccess')}</span>
          <h1 className="kk-welcome-title kk-lesen-title serif" dir="ltr">Leseverstehen</h1>
          <p className="kk-welcome-sub">{t('readingCatalogDescription')}</p>
          <div className="kk-row-actions">
            <button type="button" className="kk-cta" disabled={!randomExam} onClick={openRandom}><Icon name="shuffle" size={18} />{t('randomExam')}</button>
            <span className="kk-tag mono">B1 · B2 · {t('realExercises')}</span>
          </div>
        </div>
        <div className="kk-panel kk-minis">
          <MiniStat label={t('level')} value={level} />
          <MiniStat label={t('models')} value={String(categoryCount(section))} />
        </div>
      </section>

      <section className="kk-panel kk-toolbar">
        <div className="kk-toolbar-row">
          <div className="kk-seg" role="group" aria-label={t('level')}>
            {(['B1', 'B2'] as ReadingLevel[]).map((item) => (
              <button key={item} type="button" aria-pressed={level === item} className={level === item ? 'is-on' : undefined} onClick={() => setLevel(item)}>Telc {item}</button>
            ))}
          </div>
          <div className="kk-toolbar-actions">
            <button type="button" className="kk-pillbtn" onClick={() => { setSection('all'); setSearch(''); setFavoritesOnly(false); setSort('default'); }}>{t('clearFilters')}</button>
            <button type="button" aria-pressed={favoritesOnly} className={favoritesOnly ? 'kk-pillbtn is-on' : 'kk-pillbtn'} onClick={() => setFavoritesOnly((value) => !value)}>
              <Icon name="star" size={14} filled={favoritesOnly} />{t('favorites')} {favorites.length ? `(${favorites.length})` : ''}
            </button>
            <label className="kk-pillbtn kk-sortlabel">
              {t('sort')}
              <select aria-label={t('sortModels')} value={sort} onChange={(event) => setSort(event.target.value as SortMode)}>
                <option value="default">{t('normal')}</option>
                <option value="az">A–Z</option>
                <option value="za">Z–A</option>
              </select>
            </label>
          </div>
        </div>

        <div className="kk-tabs" role="tablist" aria-label={t('readingParts')}>
          {categories.map((category) => (
            <button key={category.section} type="button" role="tab" aria-selected={section === category.section} className={section === category.section ? 'is-on' : undefined} dir="ltr" onClick={() => setSection(category.section)}>
              <span className="german">{category.label} <small>({categoryCount(category.section)})</small></span>
              <span className="kk-tab-sub" dir={direction}>{t(category.descriptionKey)}</span>
            </button>
          ))}
        </div>

        <div className="kk-search">
          <Icon name="search" size={18} />
          <input type="search" className="kk-input" aria-label={t('searchModel')} placeholder={t('searchModel')} value={search} onChange={(event) => setSearch(event.target.value)} />
        </div>
      </section>

      <section className="kk-panel kk-banner">
        <div>
          <p className="kk-cap">{t('readingPlan')}</p>
          <h2 className="kk-panel-title serif kk-big">{t('start')} {section === 'all' ? t('fullExam') : categories.find((item) => item.section === section)?.label}</h2>
          <p className="kk-panel-body">{t('readingPlanDescription')}</p>
        </div>
        <button type="button" className="kk-ghost-btn" disabled={!randomExam} onClick={openRandom}>{t('openTraining')}<Icon name="arrowRight" size={16} className="kk-arrow" /></button>
      </section>

      {exams.isLoading && <EmptyState title={t('preparingExams')} body={t('justASecond')} />}
      {exams.isError && <EmptyState title={t('examsError')} body={t('tryAgain')} />}
      {!exams.isLoading && count === 0 && (
        <EmptyState
          title={favoritesOnly ? t('favoriteEmpty') : t('modelNotFound')}
          body={section === 'all' ? t('choosePart') : `${t('noModelsIn')} ${sectionLabels[section]}.`}
        />
      )}
      {count > 0 && (
        <section className="kk-exams" aria-label={t('readingModels')}>
          {visibleExams.map((exam, index) => (
            <ExamCard key={exam.id} exam={exam} index={index} section={section} favorite={favorites.includes(exam.id)} onToggleFavorite={toggleFavorite} />
          ))}
        </section>
      )}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return <div className="kk-ministat"><p className="kk-cap">{label}</p><p className="kk-score serif">{value}</p></div>;
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return <section className="kk-empty"><p className="kk-panel-title serif kk-big">{title}</p><p className="kk-panel-body">{body}</p></section>;
}

function ExamCard({ exam, index, section, favorite, onToggleFavorite }: { exam: ReadingExamListItem; index: number; section: Section; favorite: boolean; onToggleFavorite: (id: string) => void }) {
  const { t } = useI18n();
  const query = new URLSearchParams();
  if (section !== 'all') query.set('section', section);
  const progress = Math.max(0, Math.min(100, exam.progress?.percentage ?? 0));
  const isExercise = exam.kind === 'exercise' || !exam.isComplete;
  const displayTitle = displayReadingTitle(exam.title);
  const variants = Math.max(0, (exam.variantCount ?? 1) - 1);
  const locked = exam.accessStatus !== 'free';
  return (
    <article className="kk-exam" dir="ltr">
      <div className="kk-exam-top">
        <span className="kk-exam-n mono">{String(index + 1).padStart(2, '0')}</span>
        <div className="kk-exam-top-r">
          <span className={locked ? 'kk-badge-s is-warn' : 'kk-badge-s is-ok'}>{locked ? t('premium') : t('freeAccess')}</span>
          <button type="button" className={favorite ? 'kk-star is-on' : 'kk-star'} aria-pressed={favorite} aria-label={favorite ? t('favoriteRemove', { title: exam.title }) : t('favoriteAdd', { title: exam.title })} onClick={() => onToggleFavorite(exam.id)}>
            <Icon name="star" size={16} filled={favorite} />
          </button>
        </div>
      </div>
      <Link to={locked ? '/pricing' : `/dashboard/lesen/${exam.id}?${query.toString()}`} className="kk-exam-link" aria-label={`${t('open')} ${displayTitle}`}>
        <h2 className="kk-exam-title german" dir="ltr">{displayTitle}</h2>
        {exam.titleAr && <p className="kk-exam-ar" dir="rtl">{exam.titleAr}</p>}
        <div className="kk-meta">
          <span>{exam.level}</span>
          <span>{isExercise ? t('training') : t('exam')}</span>
          <span>{t('minutes', { count: exam.durationMinutes })}</span>
          {variants > 0 && <span className="is-accent">+{variants} {t('versions')}</span>}
        </div>
        <div className="kk-exam-progress">
          <div className="kk-exam-progress-l"><span>{Math.round(progress)}%</span><span>{t('progress')}</span></div>
          <div className="kk-progress"><div className={progress >= 100 ? 'kk-progress-fill is-done' : 'kk-progress-fill'} style={{ width: `${progress}%` }} /></div>
        </div>
        <div className="kk-parts">
          {(['teil1', 'teil2', 'teil3', 'sprach1', 'sprach2'] as const).map((code) => (
            <span key={code} className={exam.sectionCodes.includes(code) ? 'is-on' : undefined}>{sectionLabels[code]}</span>
          ))}
        </div>
      </Link>
      <div className="kk-exam-foot">{locked ? t('needPlanToStart') : variants > 0 ? t('baseVersionReady') : t('readyToStart')}</div>
    </article>
  );
}
