import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
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
    <div className="space-y-7" dir={direction}>
      <section className="rounded-[28px] border border-white/10 bg-gradient-to-br from-white/[0.08] to-white/[0.03] p-6 shadow-2xl shadow-black/30 md:p-8">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-200/70">{t('listeningIntro')}</p>
        <h1 className="german mt-3 text-left text-4xl font-black text-white md:text-6xl" dir="ltr">Hörverstehen</h1>
        <p className="mt-4 max-w-2xl text-start leading-7 text-slate-400">{t('listeningDescription')}</p>
      </section>

      <section className="rounded-[24px] border border-white/10 bg-[#10141d]/80 p-4">
        <div className="grid gap-3 md:grid-cols-3">
            {parts.map((part) => (
            <button key={part.id} type="button" dir="ltr" onClick={() => setActivePart(part.id)} className={`rounded-2xl border p-4 text-start transition ${activePart === part.id ? 'border-teal-300/40 bg-teal-300/10' : 'border-white/10 bg-white/[0.03] hover:border-white/20'}`}>
              <span className="german font-black text-white" dir="ltr">{part.label}</span>
              <span className="mt-1 block text-start text-xs text-slate-400" dir={direction}>{part.description}</span>
            </button>
          ))}
        </div>
      </section>

      <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div dir="ltr"><h2 className="german text-left text-2xl font-black text-white" dir="ltr">Hören · Teil {activePart}</h2><p className="mt-1 text-start text-sm text-slate-400" dir="ltr"><bdi dir="ltr">{t('exercisesWithAudio', { count: availableExercises.length })}</bdi></p></div>
            <input type="search" aria-label={t('searchExercise')} value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t('searchExercise')} className="min-h-11 rounded-xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-300/40" />
          </div>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {imported.map((exercise, index) => (
               <Link key={exercise.id} to={`/dashboard/horen/imported/teil${activePart}/${exercise.id}`} className="group rounded-[22px] border border-white/10 bg-[#12151d]/90 p-5 text-left shadow-xl shadow-black/20 transition hover:-translate-y-1 hover:border-cyan-300/30" dir="ltr">
                <div className="flex items-start justify-between gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-cyan-300/10 text-xs font-black text-cyan-100">{String(index + 1).padStart(2, '0')}</span><span className="rounded-full bg-emerald-300/10 px-3 py-1 text-[11px] font-black text-emerald-200">{t('readyAudio')}</span></div>
                 <h3 className="german mt-5 text-left text-lg font-black text-white" dir="ltr">{exercise.title}</h3>
                  <p className="mt-3 text-start text-sm text-slate-400" dir="ltr"><bdi dir="ltr">{t('statementsAnswered', { answered: exercise.statements.length, total: exercise.statements.length })}</bdi>{exercise.duration && <> · <bdi dir="ltr">{exercise.duration}</bdi></>}</p>
              </Link>
            ))}
             {imported.length === 0 && <p className="text-sm text-slate-400">{t('noAudioExercises')}</p>}
          </section>
        </>
    </div>
  );
}
