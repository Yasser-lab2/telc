import { Link } from 'react-router-dom';
import { Footer } from '../components/layout/Footer';
import { Navbar } from '../components/layout/Navbar';
import { Button } from '../components/ui/Button';

const modules = [
  ['01', 'Lesen', 'Travaillez les différentes parties de compréhension écrite avec une correction détaillée.'],
  ['02', 'Hören', 'Écoutez des situations proches de l’examen et vérifiez votre compréhension.'],
  ['03', 'Schreiben', 'Rédigez vos réponses et recevez un retour structuré grâce à l’IA.'],
];

export function Home() {
  return (
    <div className="app-canvas min-h-screen" dir="ltr">
      <Navbar />
      <main id="main-content" tabIndex={-1}>
        <section className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 md:px-6 lg:grid-cols-[1.08fr_0.92fr] lg:py-24">
          <div>
            <span className="inline-flex rounded-full border border-accent/20 bg-accentSoft px-4 py-2 text-xs font-extrabold uppercase tracking-[0.18em] text-accentDark">Préparation TELC B1 · B2</span>
            <h1 className="mt-6 max-w-3xl text-4xl font-black leading-[1.08] tracking-tight text-ink md:text-6xl">Préparez votre examen avec un parcours clair.</h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-muted">Entraînez Lesen, Hören et Schreiben, comprenez vos erreurs et avancez à votre rythme depuis votre téléphone ou votre ordinateur.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/register"><Button className="min-h-12 px-6">Commencer l’essai gratuit</Button></Link>
              <Link to="/pricing"><Button className="min-h-12 px-6" variant="secondary">Découvrir les offres</Button></Link>
            </div>
            <p className="mt-5 text-sm font-semibold text-muted">Essai activé à l’inscription · Aucun paiement automatique</p>
          </div>

          <div className="relative rounded-3xl border border-border bg-surface p-5 shadow-xl shadow-ink/10 md:p-7">
            <div className="flex items-center justify-between border-b border-border pb-4"><div><p className="text-xs font-extrabold uppercase tracking-[0.16em] text-accent">Aperçu d’exercice</p><h2 className="mt-1 font-black text-ink">Schreiben · B1</h2></div><span className="rounded-full bg-accentSoft px-3 py-1 text-xs font-bold text-accentDark">15 min</span></div>
            <div className="german mt-5 rounded-2xl bg-bg p-5" dir="ltr">
              <p className="text-sm font-bold text-muted">Aufgabe</p>
              <p className="mt-3 leading-7 text-ink">Sie möchten an einem Deutschkurs teilnehmen. Fragen Sie nach dem Preis, den Kurszeiten und der Prüfungsvorbereitung.</p>
            </div>
            <div className="mt-4 rounded-2xl border border-border bg-white p-5">
              <p className="german text-sm leading-7 text-muted">Sehr geehrte Damen und Herren,<br />ich interessiere mich für Ihren Deutschkurs…</p>
              <div className="mt-5 flex items-center justify-between"><span className="text-xs font-bold text-muted">11 mots</span><span className="rounded-lg bg-ink px-4 py-2 text-xs font-bold text-white">Corriger avec IA</span></div>
            </div>
          </div>
        </section>

        <section className="border-y border-border bg-surface/70">
          <div className="mx-auto max-w-7xl px-4 py-16 md:px-6">
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-accent">Une méthode simple</p>
            <h2 className="mt-3 max-w-2xl text-3xl font-black tracking-tight text-ink md:text-4xl">Travaillez chaque compétence séparément.</h2>
            <div className="mt-9 grid gap-4 md:grid-cols-3">
              {modules.map(([number, title, body]) => <article key={title} className="rounded-2xl border border-border bg-surface p-6"><span className="text-sm font-black text-accent">{number}</span><h3 className="mt-8 text-2xl font-black text-ink">{title}</h3><p className="mt-3 text-sm leading-6 text-muted">{body}</p></article>)}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-16 md:px-6"><div className="rounded-3xl bg-ink px-6 py-10 text-center text-white md:px-12 md:py-14"><p className="text-xs font-extrabold uppercase tracking-[0.2em] text-teal-200">Commencez aujourd’hui</p><h2 className="mx-auto mt-4 max-w-2xl text-3xl font-black md:text-4xl">Votre premier entraînement est à quelques minutes.</h2><p className="mx-auto mt-4 max-w-xl text-slate-300">Créez votre compte, choisissez votre niveau et explorez la plateforme pendant votre essai.</p><Link to="/register" className="mt-7 inline-flex min-h-12 items-center rounded-xl bg-white px-6 text-sm font-extrabold text-ink">Créer mon compte</Link></div></section>
      </main>
      <Footer />
    </div>
  );
}
