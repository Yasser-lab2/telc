import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { apiClient, type ReadingExamListItem } from '../lib/api';

const categories = ['Prüfungen', 'Teil 1', 'Teil 2', 'Teil 3', 'Sprach 1', 'Sprach 2'];

export function Lesen() {
  const exams = useQuery({ queryKey: ['reading-exams'], queryFn: apiClient.readingExams });
  const count = exams.data?.exams.length ?? 0;

  return (
    <div className="space-y-8">
      <section className="grid gap-5 lg:grid-cols-[1fr_280px] lg:items-end">
        <div className="rounded-[28px] border border-white/10 bg-gradient-to-br from-white/[0.08] to-white/[0.03] p-6 shadow-2xl shadow-black/30 md:p-8">
          <span className="inline-flex rounded-full border border-teal-300/20 bg-teal-300/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-teal-200">
            Modules d'examen
          </span>
          <h1 className="german mt-5 text-4xl font-black tracking-tight text-white md:text-6xl" dir="ltr">
            Leseverstehen
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-400">
            Choisis un modèle pour t'entraîner à la partie Lesen.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 rounded-[24px] border border-white/10 bg-[#12151d]/90 p-4 shadow-2xl shadow-black/30">
          <MiniStat label="Niveau" value="B1" />
          <MiniStat label="Modèles" value={String(count)} />
        </div>
      </section>

      <section className="space-y-4 rounded-[24px] border border-white/10 bg-[#10141d]/80 p-4 shadow-xl shadow-black/25 md:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex rounded-full border border-white/10 bg-black/20 p-1">
            <button type="button" className="rounded-full bg-white px-4 py-2 text-sm font-black text-slate-950">
              TELC B1
            </button>
            <button type="button" disabled className="rounded-full px-4 py-2 text-sm font-bold text-slate-600">
              TELC B2 bientôt
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            <VisualButton label="Filtrer" />
            <VisualButton label="Trier" />
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {categories.map((category, index) => (
            <button
              key={category}
              type="button"
              className={`shrink-0 rounded-full border px-4 py-2 text-sm font-bold transition ${
                index === 0
                  ? 'border-teal-300/30 bg-teal-300/10 text-teal-100'
                  : 'border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/20 hover:text-white'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        <div className="relative">
          <input
            type="search"
            placeholder="Rechercher un modèle..."
            className="min-h-12 w-full rounded-2xl border border-white/10 bg-black/25 px-4 pl-11 text-sm text-white outline-none placeholder:text-slate-600 focus:border-teal-300/40 focus:ring-2 focus:ring-teal-300/10"
          />
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">Q</span>
        </div>
      </section>

      {exams.isLoading && <EmptyState title="Chargement des examens..." body="Merci de patienter." />}

      {!exams.isLoading && count === 0 && (
        <EmptyState title="Aucun examen disponible pour le moment." body="Les modèles seront ajoutés par l'admin." />
      )}

      {count > 0 && (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {exams.data?.exams.map((exam, index) => (
            <ExamCard key={exam.id} exam={exam} index={index} />
          ))}
        </section>
      )}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-black text-white">{value}</p>
    </div>
  );
}

function VisualButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      className="min-h-10 rounded-full border border-white/10 bg-white/[0.04] px-4 text-sm font-bold text-slate-300 transition hover:border-teal-300/30 hover:bg-teal-300/10 hover:text-white"
    >
      {label}
    </button>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <section className="rounded-[28px] border border-dashed border-white/15 bg-[#10141d]/70 p-10 text-center shadow-xl shadow-black/25">
      <p className="text-xl font-black text-white">{title}</p>
      <p className="mt-3 text-sm text-slate-500">{body}</p>
    </section>
  );
}

function ExamCard({ exam, index }: { exam: ReadingExamListItem; index: number }) {
  return (
    <Link
      to={`/dashboard/lesen/${exam.id}`}
      className="group min-h-[172px] rounded-[24px] border border-white/10 bg-[#12151d]/90 p-5 shadow-xl shadow-black/25 transition hover:-translate-y-1 hover:border-blue-300/30 hover:bg-[#151b26]"
      aria-label={`Ouvrir ${exam.title}`}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-2xl border border-blue-300/20 bg-blue-400/10 text-blue-200">
          {String(index + 1).padStart(2, '0')}
        </span>
        <span className="rounded-full border border-teal-300/20 bg-teal-300/10 px-3 py-1 text-xs font-black text-teal-100">
          {exam.accessStatus === 'free' ? 'Free' : 'Premium'}
        </span>
      </div>

      <div className="mt-7 flex items-end justify-between gap-4">
        <div className="min-w-0">
          <h2 className="german truncate text-xl font-black text-white" dir="ltr">
            {exam.title}
          </h2>
          <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-slate-500">
            <span className="rounded-full bg-white/[0.04] px-2.5 py-1">{exam.level}</span>
            <span className="rounded-full bg-white/[0.04] px-2.5 py-1">{exam.durationMinutes} min</span>
            <span className="rounded-full bg-white/[0.04] px-2.5 py-1">0/{exam.scoreMax}</span>
          </div>
        </div>
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/10 text-slate-400 transition group-hover:border-blue-300/30 group-hover:bg-blue-300/10 group-hover:text-white">
          →
        </span>
      </div>
    </Link>
  );
}
