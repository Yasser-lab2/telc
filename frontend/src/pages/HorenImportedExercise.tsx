import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import importedTeil1 from '../data/zertify-horen-teil1.json';
import importedTeil2 from '../data/zertify-horen-teil2.json';
import importedTeil3 from '../data/zertify-horen-teil3.json';
import { useI18n } from '../lib/i18n';

const importedLibraries = { teil1: importedTeil1, teil2: importedTeil2, teil3: importedTeil3 } as const;

export function HorenImportedExercise() {
  const { direction, t } = useI18n();
  const { teil = 'teil1', exerciseId = '' } = useParams();
  const library = importedLibraries[teil as keyof typeof importedLibraries];
  const exercise = useMemo(() => library?.exercises.find((item) => item.id === exerciseId), [exerciseId, library]);
  const [answers, setAnswers] = useState<Record<number, 'R' | 'F'>>({});

  if (!exercise) return <div className="space-y-4" dir={direction}><p className="text-red-300">{t('exerciseNotFound')}</p><Link className="font-bold text-teal-200" to="/dashboard/horen">← {t('returnToListening')}</Link></div>;

  return (
    <div className="space-y-6" dir={direction}>
      <Link to="/dashboard/horen" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm font-bold text-slate-300 hover:text-white">← {t('returnExercises')}</Link>
      <section className="rounded-[28px] border border-white/10 bg-gradient-to-br from-white/[0.08] to-white/[0.03] p-6 md:p-8">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-teal-200/70" dir="ltr">Hören · B2 · Teil {exercise.teil}</p>
        <h1 className="german mt-3 text-3xl font-black text-white md:text-5xl" dir="ltr">{exercise.title}</h1>
        <p className="mt-3 text-sm text-slate-400" dir={direction}>{t('importedListeningInstruction')}</p>
      </section>

      <section className="rounded-[22px] border border-white/10 bg-[#12151d]/90 p-5">
        {exercise.audioUrl ? <audio className="w-full" controls preload="metadata" src={exercise.audioUrl} /> : <div className="rounded-xl border border-amber-300/20 bg-amber-300/10 p-4 text-sm text-amber-100">{t('audioUnavailable')}</div>}
      </section>

      <section className="rounded-[24px] border border-white/10 bg-[#12151d]/90 p-5">
        <div className="mb-5 flex items-center justify-between gap-3"><h2 className="font-black text-white" dir={direction}>{t('statements')}</h2><span className="text-sm font-bold text-slate-400" dir="ltr">{t('statementsAnswered', { answered: Object.keys(answers).length, total: exercise.statements.length })}</span></div>
        <div className="space-y-3">
          {exercise.statements.map((statement) => (
            <div key={statement.number} className="grid gap-4 rounded-2xl border border-white/10 bg-black/20 p-4 text-left md:grid-cols-[1fr_auto] md:items-center" dir="ltr">
              <p className="german leading-7 text-slate-100" dir="ltr"><span className="mr-2 font-black text-teal-200">{statement.number}.</span>{statement.text}</p>
              <div className="grid grid-cols-2 gap-2">
                {([['R', 'Richtig', t('trueLabel')], ['F', 'Falsch', t('falseLabel')]] as const).map(([code, germanLabel, label]) => <button key={code} type="button" onClick={() => setAnswers((current) => ({ ...current, [statement.number]: code }))} className={`min-h-10 rounded-xl border px-4 text-sm font-black transition ${answers[statement.number] === code ? 'border-teal-300/50 bg-teal-300/15 text-white' : 'border-white/10 text-slate-400 hover:text-white'}`}><span className="german" dir="ltr">{germanLabel}</span> · <bdi dir={direction}>{label}</bdi></button>)}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-5 rounded-xl border border-blue-300/20 bg-blue-300/[0.07] p-4 text-sm leading-6 text-blue-100">{t('trainingMode')}</div>
      </section>
    </div>
  );
}
