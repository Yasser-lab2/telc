import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { apiClient } from '../lib/api';
import { useI18n } from '../lib/i18n';

export function Schreiben() {
  const { direction, t } = useI18n();
  const types = useQuery({ queryKey: ['schreiben'], queryFn: apiClient.schreiben });
  return (
    <div className="space-y-7" dir={direction}>
      <section className="rounded-[28px] border border-amber-300/15 bg-gradient-to-br from-amber-300/[0.12] via-[#15141a] to-[#10141d] p-6 shadow-2xl shadow-black/30 md:p-8">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-200">{t('writingIntro')}</p>
        <h1 className="german mt-3 text-left text-4xl font-black text-white md:text-6xl" dir="ltr">Schreiben</h1>
        <p className="mt-4 max-w-2xl text-start text-base leading-8 text-slate-300">{t('writingDescription')}</p>
        <div className="mt-5 flex flex-wrap justify-start gap-2 text-xs font-bold text-slate-400"><span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2">{t('minutes', { count: 30 })}</span><span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2">{t('draftSavedLabel')}</span><span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-amber-100">{t('structuredCorrection')}</span></div>
      </section>
      <div className="flex items-end justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-amber-200">{t('chooseTopic')}</p><h2 className="mt-2 text-2xl font-black text-white">{t('writingToday')}</h2></div><span className="text-sm text-slate-500">{t('topics', { count: types.data?.types.length ?? 0 })}</span></div>
      {types.isLoading && <p className="text-slate-400">{t('preparingTopics')}</p>}
      {types.isError && <p className="text-red-300">{t('topicsError')}</p>}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {types.data?.types.map((type) => (
          <Link key={type.id} to={`/dashboard/schreiben/${type.id}`} className="group rounded-[24px] border border-white/10 bg-[#12151d]/90 p-5 text-left shadow-xl shadow-black/20 transition hover:-translate-y-1 hover:border-amber-300/30 hover:bg-[#171822]" dir="ltr">
            <div className="flex items-start justify-between gap-3"><span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-xs font-black text-amber-100">{type.niveau}</span><span className="grid h-10 w-10 place-items-center rounded-xl bg-white/[0.05] text-xl text-amber-200">✎</span></div>
            <h2 className="german mt-6 text-left text-xl font-black text-white" dir="ltr">{type.title}</h2>
            <p className="mt-3 line-clamp-3 text-sm leading-7 text-slate-400" dir="ltr">{type.context}</p>
            <span className="mt-5 inline-flex text-sm font-black text-amber-200 group-hover:text-white">{t('startWriting')} ←</span>
          </Link>
        ))}
      </section>
    </div>
  );
}
