import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import importedTeil1 from '../data/zertify-horen-teil1.json';
import importedTeil2 from '../data/zertify-horen-teil2.json';
import importedTeil3 from '../data/zertify-horen-teil3.json';

const parts = [
  { id: 1, label: 'Teil 1', description: 'Courtes informations · Richtig oder Falsch' },
  { id: 2, label: 'Teil 2', description: 'Conversations et compréhension globale' },
  { id: 3, label: 'Teil 3', description: 'Compréhension détaillée' },
] as const;

const importedLibraries = { 1: importedTeil1, 2: importedTeil2, 3: importedTeil3 } as const;
type HorenPart = keyof typeof importedLibraries;

export function Horen() {
  const [activePart, setActivePart] = useState<HorenPart>(1);
  const [search, setSearch] = useState('');
  const activeLibrary = importedLibraries[activePart];
  const availableExercises = useMemo(() => activeLibrary.exercises.filter((exercise) => Boolean(exercise.audioUrl)), [activeLibrary]);
  const imported = useMemo(
    () => availableExercises.filter((exercise) => exercise.title.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())),
    [availableExercises, search],
  );

  return (
    <div className="space-y-7">
      <section className="rounded-[28px] border border-white/10 bg-gradient-to-br from-white/[0.08] to-white/[0.03] p-6 shadow-2xl shadow-black/30 md:p-8">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-teal-200/70">Compréhension orale</p>
        <h1 className="mt-3 text-4xl font-black text-white md:text-6xl">Hören</h1>
        <p className="mt-4 max-w-2xl leading-7 text-slate-400">Choisissez une partie, écoutez l’enregistrement et travaillez les affirmations comme à l’examen TELC.</p>
      </section>

      <section className="rounded-[24px] border border-white/10 bg-[#10141d]/80 p-4">
        <div className="grid gap-3 md:grid-cols-3">
          {parts.map((part) => (
            <button key={part.id} type="button" onClick={() => setActivePart(part.id)} className={`rounded-2xl border p-4 text-left transition ${activePart === part.id ? 'border-teal-300/40 bg-teal-300/10' : 'border-white/10 bg-white/[0.03] hover:border-white/20'}`}>
              <span className="font-black text-white">{part.label}</span>
              <span className="mt-1 block text-xs text-slate-400">{part.description}</span>
            </button>
          ))}
        </div>
      </section>

      <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div><h2 className="text-2xl font-black text-white">Bibliothèque Teil {activePart}</h2><p className="mt-1 text-sm text-slate-400">{availableExercises.length} exercices B2 avec audio disponible</p></div>
            <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher un exercice…" className="min-h-11 rounded-xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none placeholder:text-slate-500 focus:border-teal-300/40" />
          </div>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {imported.map((exercise, index) => (
              <Link key={exercise.id} to={`/dashboard/horen/imported/teil${activePart}/${exercise.id}`} className="group rounded-[22px] border border-white/10 bg-[#12151d]/90 p-5 shadow-xl shadow-black/20 transition hover:-translate-y-1 hover:border-teal-300/30">
                <div className="flex items-start justify-between gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-teal-300/10 text-xs font-black text-teal-100">{String(index + 1).padStart(2, '0')}</span><span className="rounded-full bg-emerald-300/10 px-3 py-1 text-[11px] font-black text-emerald-200">Audio disponible</span></div>
                <h3 className="german mt-5 text-lg font-black text-white" dir="ltr">{exercise.title}</h3>
                <p className="mt-3 text-sm text-slate-400">{exercise.statements.length} affirmations{exercise.duration ? ` · ${exercise.duration}` : ''}</p>
              </Link>
            ))}
          </section>
        </>
    </div>
  );
}
