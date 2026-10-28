import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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

  return (
    <div className="lesen-page space-y-7" dir={direction}>
      <section className="grid gap-5 lg:grid-cols-[1fr_250px] lg:items-end">
        <div className="catalog-hero rounded-[28px] border border-white/10 bg-gradient-to-br from-white/[0.1] to-white/[0.03] p-6 shadow-2xl shadow-black/30 md:p-8">
          <span className="inline-flex rounded-full border border-indigo-300/25 bg-indigo-300/10 px-3 py-1 text-xs font-bold text-indigo-100">
            {t('practiceSpace')} · {t('freeAccess')}
          </span>
          <h1 className="german mt-5 text-left text-4xl font-black tracking-tight text-white md:text-6xl" dir="ltr">
            Leseverstehen
          </h1>
          <p className="mt-4 max-w-2xl text-start text-base leading-8 text-slate-300">
            {t('readingCatalogDescription')}
          </p>
          <div className="mt-6 flex flex-wrap justify-start gap-3">
            <button
              type="button"
              disabled={!randomExam}
              onClick={() => randomExam && navigate(`/dashboard/lesen/${randomExam.id}${section !== 'all' ? `?section=${section}` : ''}`)}
              className="min-h-11 rounded-2xl bg-indigo-400 px-5 text-sm font-black text-white shadow-lg shadow-indigo-950/30 transition hover:bg-indigo-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              🎲 {t('randomExam')}
            </button>
            <span className="inline-flex items-center rounded-2xl border border-white/10 px-4 text-xs font-bold text-slate-400">
              B1 · B2 · {t('realExercises')}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 rounded-[24px] border border-white/10 bg-[#12151d]/90 p-4 shadow-2xl shadow-black/30">
          <MiniStat label={t('level')} value={level} />
          <MiniStat label={t('models')} value={String(categoryCount(section))} />
        </div>
      </section>

      <section className="space-y-4 rounded-[24px] border border-white/10 bg-[#10141d]/80 p-4 shadow-xl shadow-black/25 md:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex rounded-full border border-white/10 bg-black/20 p-1" role="group" aria-label={t('level')}>
            {(['B1', 'B2'] as ReadingLevel[]).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setLevel(item)}
                className={`rounded-full px-4 py-2 text-sm font-black transition ${level === item ? 'bg-indigo-400 text-white shadow-lg shadow-indigo-950/30' : 'text-slate-400 hover:bg-white/10 hover:text-white'}`}
              >
                Telc {item}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => { setSection('all'); setSearch(''); setFavoritesOnly(false); setSort('default'); }} className="min-h-10 rounded-full border border-white/10 bg-white/[0.04] px-4 text-sm font-bold text-slate-300 transition hover:border-indigo-300/30 hover:bg-indigo-300/10 hover:text-white">
               {t('clearFilters')}
            </button>
            <button type="button" onClick={() => setFavoritesOnly((value) => !value)} className={`min-h-10 rounded-full border px-4 text-sm font-bold transition ${favoritesOnly ? 'border-amber-300/40 bg-amber-300/10 text-amber-100' : 'border-white/10 bg-white/[0.04] text-slate-300 hover:border-amber-300/30'}`}>
               ★ {t('favorites')} {favorites.length ? `(${favorites.length})` : ''}
            </button>
            <label className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 text-sm font-bold text-slate-300">
              {t('sort')}
              <select aria-label={t('sortModels')} value={sort} onChange={(event) => setSort(event.target.value as SortMode)} className="bg-transparent text-white outline-none">
                <option value="default">{t('normal')}</option>
                <option value="az">A–Z</option>
                <option value="za">Z–A</option>
              </select>
            </label>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label={t('readingParts')}>
          {categories.map((category) => (
            <button
              key={category.section}
              type="button"
              onClick={() => setSection(category.section)}
               role="tab"
               aria-selected={section === category.section}
               dir="ltr"
                className={`shrink-0 rounded-2xl border px-4 py-2 text-start text-sm font-bold transition ${section === category.section ? 'border-indigo-300/40 bg-indigo-400/15 text-indigo-100 shadow-lg shadow-indigo-950/20' : 'border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/20 hover:text-white'}`}
             >
               <span className="german block" dir="ltr">{category.label} <span className="mr-1 text-xs text-slate-500">({categoryCount(category.section)})</span></span>
               <span className="mt-0.5 block text-start text-[10px] font-normal text-slate-500" dir={direction}>{t(category.descriptionKey)}</span>
            </button>
          ))}
        </div>

        <div className="relative">
          <input
            type="search"
            aria-label={t('searchModel')}
            placeholder={t('searchModel')}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="min-h-12 w-full rounded-2xl border border-white/10 bg-black/25 px-4 pl-11 text-sm text-white outline-none placeholder:text-slate-600 focus:border-indigo-300/40 focus:ring-2 focus:ring-indigo-300/10"
          />
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg text-slate-500" aria-hidden="true">⌕</span>
        </div>
      </section>

      <section className="flex flex-col gap-4 rounded-[24px] border border-indigo-300/15 bg-gradient-to-l from-indigo-400/[0.12] via-cyan-300/[0.05] to-transparent p-5 shadow-xl shadow-indigo-950/10 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-indigo-200">{t('readingPlan')}</p>
          <h2 className="mt-2 text-xl font-black text-white">{t('start')} {section === 'all' ? t('fullExam') : categories.find((item) => item.section === section)?.label}</h2>
          <p className="mt-1 text-sm leading-6 text-slate-400">{t('readingPlanDescription')}</p>
        </div>
        <button type="button" disabled={!randomExam} onClick={() => randomExam && navigate(`/dashboard/lesen/${randomExam.id}${section !== 'all' ? `?section=${section}` : ''}`)} className="min-h-11 shrink-0 rounded-2xl border border-indigo-300/30 bg-indigo-300/10 px-5 text-sm font-black text-indigo-100 transition hover:bg-indigo-300/20 disabled:opacity-40">
          {t('openTraining')} →
        </button>
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
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label={t('readingModels')}>
          {visibleExams.map((exam, index) => (
            <ExamCard key={exam.id} exam={exam} index={index} section={section} favorite={favorites.includes(exam.id)} onToggleFavorite={toggleFavorite} />
          ))}
        </section>
      )}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-start"><p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{label}</p><p className="mt-2 text-3xl font-black text-white">{value}</p></div>;
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return <section className="rounded-[28px] border border-dashed border-white/15 bg-[#10141d]/70 p-10 text-center shadow-xl shadow-black/25"><p className="text-xl font-black text-white">{title}</p><p className="mt-3 text-sm text-slate-500">{body}</p></section>;
}

function ExamCard({ exam, index, section, favorite, onToggleFavorite }: { exam: ReadingExamListItem; index: number; section: Section; favorite: boolean; onToggleFavorite: (id: string) => void }) {
  const { t } = useI18n();
  const query = new URLSearchParams();
  if (section !== 'all') query.set('section', section);
  const progress = exam.progress?.percentage ?? 0;
  const isExercise = exam.kind === 'exercise' || !exam.isComplete;
  const displayTitle = displayReadingTitle(exam.title);
  const variants = Math.max(0, (exam.variantCount ?? 1) - 1);
  const locked = exam.accessStatus !== 'free';
  return (
    <article className="group min-h-[228px] rounded-[24px] border border-white/10 bg-[#12151d]/90 p-5 text-left shadow-xl shadow-black/25 transition hover:-translate-y-1 hover:border-indigo-300/30 hover:bg-[#151b26]" dir="ltr">
      <div className="flex items-start justify-between gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-2xl border border-indigo-300/20 bg-indigo-400/10 text-sm font-black text-indigo-200">{String(index + 1).padStart(2, '0')}</span>
        <div className="flex items-center gap-2">
          <span className={`rounded-full border px-3 py-1 text-xs font-black ${locked ? 'border-amber-300/30 bg-amber-300/10 text-amber-100' : 'border-emerald-300/20 bg-emerald-300/10 text-emerald-100'}`}>{locked ? t('premium') : t('freeAccess')}</span>
          <button type="button" aria-label={favorite ? t('favoriteRemove', { title: exam.title }) : t('favoriteAdd', { title: exam.title })} onClick={() => onToggleFavorite(exam.id)} className={`grid h-9 w-9 place-items-center rounded-full border text-lg transition ${favorite ? 'border-amber-300/40 bg-amber-300/10 text-amber-100' : 'border-white/10 text-slate-500 hover:border-amber-300/30 hover:text-amber-100'}`}>
            ★
          </button>
        </div>
      </div>
         <Link to={locked ? '/pricing' : `/dashboard/lesen/${exam.id}?${query.toString()}`} className="block" aria-label={`${t('open')} ${displayTitle}`}>
        <div className="mt-6 min-w-0">
          <h2 className="german truncate text-left text-xl font-black text-white" dir="ltr">{displayTitle}</h2>
          {exam.titleAr && <p className="mt-2 truncate text-sm text-slate-400" dir="rtl">{exam.titleAr}</p>}
          <div className="mt-3 flex flex-wrap justify-start gap-2 text-xs font-bold text-slate-500">
            <span className="rounded-full bg-white/[0.04] px-2.5 py-1">{exam.level}</span>
            <span className="rounded-full bg-white/[0.04] px-2.5 py-1">{isExercise ? t('training') : t('exam')}</span>
            <span className="rounded-full bg-white/[0.04] px-2.5 py-1">{t('minutes', { count: exam.durationMinutes })}</span>
            {variants > 0 && <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-2.5 py-1 text-cyan-100">+{variants} {t('versions')}</span>}
          </div>
        </div>
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500"><span>{Math.round(progress)}%</span><span>{t('progress')}</span></div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/[0.08]"><div className="h-full rounded-full bg-gradient-to-l from-indigo-400 to-cyan-300" style={{ width: `${Math.max(0, Math.min(100, progress))}%` }} /></div>
        </div>
        <div className="mt-4 flex flex-wrap justify-start gap-1.5">
          {(['teil1', 'teil2', 'teil3', 'sprach1', 'sprach2'] as const).map((code) => (
            <span key={code} className={`rounded-full px-2 py-1 text-[10px] font-black ${exam.sectionCodes.includes(code) ? 'bg-teal-300/10 text-teal-100' : 'bg-white/[0.03] text-slate-600'}`}>
              {sectionLabels[code]}
            </span>
          ))}
        </div>
      </Link>
      <div className="mt-4 border-t border-white/10 pt-3 text-xs font-bold text-slate-500">
        {locked ? t('needPlanToStart') : variants > 0 ? t('baseVersionReady') : t('readyToStart')}
      </div>
    </article>
  );
}
