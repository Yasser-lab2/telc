import { Link } from 'react-router-dom';
import { Footer } from '../components/layout/Footer';
import { Navbar } from '../components/layout/Navbar';
import { Button } from '../components/ui/Button';
import { useI18n } from '../lib/i18n';

export function Home() {
  const { direction, t } = useI18n();
  const modules = [
    ['01', 'Lesen', t('moduleReadingBody')],
    ['02', 'Hören', t('moduleListeningBody')],
    ['03', 'Schreiben', t('moduleWritingBody')],
    ['04', 'Sprechen', t('moduleSpeakingBody')],
  ];
  return (
    <div className="app-canvas min-h-screen" dir={direction}>
      <Navbar />
      <main id="main-content" tabIndex={-1}>
        <section className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 md:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:py-24">
          <div>
            <span className="inline-flex rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-xs font-black tracking-[0.12em] text-cyan-100">{t('homeBadge')}</span>
            <h1 className="mt-6 max-w-3xl text-4xl font-black leading-[1.12] tracking-tight text-white md:text-6xl">{t('homeHeroTitle')}</h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">{t('homeDescription')}</p>
            <div className="mt-8 flex flex-wrap justify-start gap-3">
              <Link to="/register"><Button className="min-h-12 bg-indigo-400 px-6 hover:bg-indigo-300">{t('startFreeTrial')}</Button></Link>
              <Link to="/pricing"><Button className="min-h-12 border-white/10 bg-white/[0.04] px-6 text-white hover:bg-white/10" variant="secondary">{t('seePlans')}</Button></Link>
            </div>
            <p className="mt-5 text-sm font-semibold text-slate-500">{t('noAutomaticCharge')}</p>
          </div>

          <div className="rounded-[28px] border border-indigo-300/20 bg-gradient-to-br from-indigo-400/[0.14] to-[#10141d] p-5 shadow-2xl shadow-indigo-950/30 md:p-7">
            <div className="flex items-center justify-between border-b border-white/10 pb-4"><div><p className="text-xs font-black uppercase tracking-[0.16em] text-amber-200">{t('homeAssistant')}</p><h2 className="german mt-1 text-left font-black text-white" dir="ltr">Schreiben · B1</h2></div><span className="rounded-full bg-amber-300/10 px-3 py-1 text-xs font-bold text-amber-100" dir={direction}>{t('minutes', { count: 30 })}</span></div>
            <div className="german mt-5 rounded-2xl bg-black/25 p-5 text-slate-200" dir="ltr"><p className="text-sm font-bold text-slate-500">Aufgabe</p><p className="mt-3 leading-7">Sie möchten an einem Deutschkurs teilnehmen. Fragen Sie nach dem Preis, den Kurszeiten und der Prüfungsvorbereitung.</p></div>
            <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.06] p-5"><p className="german text-sm leading-7 text-slate-300" dir="ltr">Sehr geehrte Damen und Herren,<br />ich interessiere mich für Ihren Deutschkurs…</p><div className="mt-5 flex items-center justify-between"><span className="text-xs font-bold text-slate-500">{t('savedDraftShort')}</span><span className="rounded-lg bg-amber-300/15 px-4 py-2 text-xs font-bold text-amber-100">{t('aiCorrection')}</span></div></div>
          </div>
        </section>

        <section className="border-y border-white/10 bg-[#10141d]/60">
          <div className="mx-auto max-w-7xl px-4 py-16 md:px-6">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-indigo-200">{t('clearPath')}</p>
            <h2 className="mt-3 max-w-2xl text-3xl font-black tracking-tight text-white md:text-4xl">{t('skillFocus')}</h2>
            <div className="mt-9 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {modules.map(([number, title, body]) => <article key={title} className="rounded-[22px] border border-white/10 bg-[#12151d]/90 p-6 shadow-xl shadow-black/15"><span className="text-sm font-black text-indigo-200">{number}</span><h3 className="german mt-8 text-2xl font-black text-white" dir="ltr">{title}</h3><p className="mt-3 text-sm leading-7 text-slate-400">{body}</p></article>)}
            </div>
          </div>
        </section>

         <section className="mx-auto max-w-7xl px-4 py-16 md:px-6"><div className="rounded-[28px] border border-cyan-300/15 bg-gradient-to-l from-cyan-300/[0.12] to-[#0b1020] px-6 py-10 text-center text-white md:px-12 md:py-14"><p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-200">{t('homeCtaTitle')}</p><h2 className="mx-auto mt-4 max-w-2xl text-3xl font-black md:text-4xl">{t('homeCtaTitle')}</h2><p className="mx-auto mt-4 max-w-xl text-slate-300">{t('homeCtaBody')}</p><Link to="/register" className="mt-7 inline-flex min-h-12 items-center rounded-xl bg-white px-6 text-sm font-black text-slate-950">{t('registerNow')}</Link></div></section>
      </main>
      <Footer />
    </div>
  );
}
