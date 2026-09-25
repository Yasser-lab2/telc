import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiClient, type ReadingExamListItem } from '../lib/api';

const categories = [
  { label: 'Examens complets', section: 'all', description: 'Les cinq parties' },
  { label: 'Teil 1', section: 'teil1', description: 'Textes et titres' },
  { label: 'Teil 2', section: 'teil2', description: 'Texte et choix multiple' },
  { label: 'Teil 3', section: 'teil3', description: 'Situations et annonces' },
  { label: 'Sprach 1', section: 'sprach1', description: 'Textes à trous avec trois choix' },
  { label: 'Sprach 2', section: 'sprach2', description: 'Banque de mots et textes à trous' },
] as const;
type ReadingLevel = 'B1' | 'B2';
type SortMode = 'default' | 'az' | 'za';
type Section = (typeof categories)[number]['section'];

const sectionLabels: Record<Exclude<Section, 'all'>, string> = {
  teil1: 'Teil 1',
  teil2: 'Teil 2',
  teil3: 'Teil 3',
  sprach1: 'Sprach 1',
  sprach2: 'Sprach 2',
};

export function Lesen() {
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

  const toggleFavorite = (id: string) => {
    setFavorites((current) => {
      const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
      window.localStorage.setItem('lesen:favorites', JSON.stringify(next));
      return next;
    });
  };

  const visibleExams = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase();
    const filtered = (exams.data?.exams ?? []).filter((exam) => {
      const isComplete = exam.isComplete ?? exam.sectionCodes.length === 5;
      const matchesLevel = exam.level === level;
      const matchesCategory = section === 'all' ? isComplete : !isComplete && exam.sectionCodes.includes(section);
      const matchesSearch = [exam.title, exam.titleAr ?? ''].some((value) => value.toLocaleLowerCase().includes(normalizedSearch));
      const matchesFavorite = !favoritesOnly || favorites.includes(exam.id);
      return matchesLevel && matchesCategory && matchesSearch && matchesFavorite;
    });
    return [...filtered].sort((left, right) => {
      if (sort === 'az') return left.title.localeCompare(right.title, 'de');
      if (sort === 'za') return right.title.localeCompare(left.title, 'de');
      return (left.createdAt ?? '').localeCompare(right.createdAt ?? '') || left.title.localeCompare(right.title, 'de');
    });
  }, [exams.data?.exams, favorites, favoritesOnly, level, search, section, sort]);

  const randomExam = visibleExams.find((exam) => exam.isComplete) ?? exams.data?.exams.find((exam) => exam.level === level && exam.isComplete);
  const count = visibleExams.length;

  return (
    <div className="space-y-8">
      <section className="grid gap-5 lg:grid-cols-[1fr_280px] lg:items-end">
        <div className="rounded-[28px] border border-white/10 bg-gradient-to-br from-white/[0.08] to-white/[0.03] p-6 shadow-2xl shadow-black/30 md:p-8">
          <span className="inline-flex rounded-full border border-teal-300/20 bg-teal-300/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-teal-200">
            Modules d’examen
          </span>
          <h1 className="german mt-5 text-4xl font-black tracking-tight text-white md:text-6xl" dir="ltr">
            Leseverstehen
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-400">
            Choisissez un examen complet ou entraînez-vous sur une partie précise.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              disabled={!randomExam}
              onClick={() => randomExam && navigate(`/dashboard/lesen/${randomExam.id}`)}
              className="min-h-11 rounded-2xl bg-white px-5 text-sm font-black text-slate-950 transition hover:bg-teal-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Lancer un examen au hasard
            </button>
            <span className="inline-flex items-center rounded-2xl border border-white/10 px-4 text-xs font-bold text-slate-400">
              Exercices TELC B1 et B2
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 rounded-[24px] border border-white/10 bg-[#12151d]/90 p-4 shadow-2xl shadow-black/30">
          <MiniStat label="Niveau" value={level} />
          <MiniStat label="Modèles" value={String(count)} />
        </div>
      </section>


      <section className="space-y-4 rounded-[24px] border border-white/10 bg-[#10141d]/80 p-4 shadow-xl shadow-black/25 md:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex rounded-full border border-white/10 bg-black/20 p-1">
            {(['B1', 'B2'] as ReadingLevel[]).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setLevel(item)}
                className={`rounded-full px-4 py-2 text-sm font-black transition ${level === item ? 'bg-white text-slate-950' : 'text-slate-400 hover:bg-white/10 hover:text-white'}`}
              >
                TELC {item}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => { setSection('all'); setSearch(''); setFavoritesOnly(false); }} className="min-h-10 rounded-full border border-white/10 bg-white/[0.04] px-4 text-sm font-bold text-slate-300 transition hover:border-teal-300/30 hover:bg-teal-300/10 hover:text-white">
              Réinitialiser les filtres
            </button>
            <button type="button" onClick={() => setFavoritesOnly((value) => !value)} className={`min-h-10 rounded-full border px-4 text-sm font-bold transition ${favoritesOnly ? 'border-amber-300/40 bg-amber-300/10 text-amber-100' : 'border-white/10 bg-white/[0.04] text-slate-300 hover:border-amber-300/30'}`}>
              ★ Favoris {favorites.length ? `(${favorites.length})` : ''}
            </button>
            <label className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 text-sm font-bold text-slate-300">
              Tri
              <select value={sort} onChange={(event) => setSort(event.target.value as SortMode)} className="bg-transparent text-white outline-none">
                <option value="default">Par défaut</option>
                <option value="az">A–Z</option>
                <option value="za">Z–A</option>
              </select>
            </label>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {categories.map((category) => (
            <button
              key={category.section}
              type="button"
              onClick={() => setSection(category.section)}
              className={`shrink-0 rounded-full border px-4 py-2 text-sm font-bold transition ${section === category.section ? 'border-teal-300/30 bg-teal-300/10 text-teal-100' : 'border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/20 hover:text-white'}`}
            >
              {category.label}
            </button>
          ))}
        </div>

        <div className="relative">
          <input
            type="search"
            placeholder="Rechercher un modèle..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="min-h-12 w-full rounded-2xl border border-white/10 bg-black/25 px-4 pl-11 text-sm text-white outline-none placeholder:text-slate-600 focus:border-teal-300/40 focus:ring-2 focus:ring-teal-300/10"
          />
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">Q</span>
        </div>
      </section>

      {exams.isLoading && <EmptyState title="Chargement des examens…" body="Veuillez patienter un instant." />}
      {exams.isError && <EmptyState title="Impossible de charger les examens." body="Reconnectez-vous puis réessayez." />}
      {!exams.isLoading && count === 0 && (
        <EmptyState
          title={favoritesOnly ? 'Aucun favori pour ce filtre.' : 'Aucun exercice trouvé.'}
          body={section === 'all' ? 'Choisissez une partie pour afficher les exercices individuels.' : `Aucun modèle n’est disponible actuellement pour ${sectionLabels[section]}.`}
        />
      )}
      {count > 0 && (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {visibleExams.map((exam, index) => (
            <ExamCard key={exam.id} exam={exam} index={index} section={section} favorite={favorites.includes(exam.id)} onToggleFavorite={toggleFavorite} />
          ))}
        </section>
      )}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"><p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{label}</p><p className="mt-2 text-3xl font-black text-white">{value}</p></div>;
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return <section className="rounded-[28px] border border-dashed border-white/15 bg-[#10141d]/70 p-10 text-center shadow-xl shadow-black/25"><p className="text-xl font-black text-white">{title}</p><p className="mt-3 text-sm text-slate-500">{body}</p></section>;
}

function ExamCard({ exam, index, section, favorite, onToggleFavorite }: { exam: ReadingExamListItem; index: number; section: Section; favorite: boolean; onToggleFavorite: (id: string) => void }) {
  const query = new URLSearchParams();
  if (section !== 'all') query.set('section', section);
  const progress = exam.progress?.percentage ?? 0;
  const isExercise = exam.kind === 'exercise' || !exam.isComplete;
  return (
    <article className="group min-h-[220px] rounded-[24px] border border-white/10 bg-[#12151d]/90 p-5 shadow-xl shadow-black/25 transition hover:-translate-y-1 hover:border-blue-300/30 hover:bg-[#151b26]">
      <div className="flex items-start justify-between gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-2xl border border-blue-300/20 bg-blue-400/10 text-blue-200">{String(index + 1).padStart(2, '0')}</span>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-teal-300/20 bg-teal-300/10 px-3 py-1 text-xs font-black text-teal-100">{exam.accessStatus === 'free' ? 'Free' : 'Premium'}</span>
          <button type="button" aria-label={favorite ? `Retirer des favoris : ${exam.title}` : `Ajouter aux favoris : ${exam.title}`} onClick={() => onToggleFavorite(exam.id)} className={`grid h-9 w-9 place-items-center rounded-full border text-lg transition ${favorite ? 'border-amber-300/40 bg-amber-300/10 text-amber-100' : 'border-white/10 text-slate-500 hover:border-amber-300/30 hover:text-amber-100'}`}>
            ★
          </button>
        </div>
      </div>
      <Link to={`/dashboard/lesen/${exam.id}?${query.toString()}`} className="block" aria-label={`Ouvrir ${exam.title}`}>
        <div className="mt-6 min-w-0">
          <h2 className="german truncate text-xl font-black text-white" dir="ltr">{exam.title}</h2>
          {exam.titleAr && <p className="mt-2 truncate text-sm text-slate-400" dir="rtl">{exam.titleAr}</p>}
          <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-slate-500">
            <span className="rounded-full bg-white/[0.04] px-2.5 py-1">{exam.level}</span>
            <span className="rounded-full bg-white/[0.04] px-2.5 py-1">{isExercise ? 'Exercice' : 'Examen'}</span>
            <span className="rounded-full bg-white/[0.04] px-2.5 py-1">{exam.durationMinutes} min</span>
          </div>
        </div>
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500"><span>Progression</span><span>{Math.round(progress)}%</span></div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/[0.08]"><div className="h-full rounded-full bg-gradient-to-r from-accent to-teal-300" style={{ width: `${Math.max(0, Math.min(100, progress))}%` }} /></div>
        </div>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {(['teil1', 'teil2', 'teil3', 'sprach1', 'sprach2'] as const).map((code) => (
            <span key={code} className={`rounded-full px-2 py-1 text-[10px] font-black ${exam.sectionCodes.includes(code) ? 'bg-teal-300/10 text-teal-100' : 'bg-white/[0.03] text-slate-600'}`}>
              {sectionLabels[code]}
            </span>
          ))}
        </div>
      </Link>
    </article>
  );
}
