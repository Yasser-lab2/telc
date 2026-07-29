import { Link } from 'react-router-dom';
import { Footer } from '../components/layout/Footer';
import { Navbar } from '../components/layout/Navbar';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

export function Home() {
  return (
    <div className="min-h-screen bg-bg" dir="ltr">
      <Navbar />
      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 md:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-accent">TELC B1/B2 pour le Maroc</p>
            <h1 className="mt-4 text-4xl font-bold text-text md:text-6xl">Prépare ton TELC avec une méthode simple.</h1>
            <p className="mt-5 max-w-2xl text-lg text-muted">
              Exercices Lesen, Hören et Schreiben, correction IA côté serveur, et activation par WhatsApp + CIH. Sahl,
              direct, bla complications.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/register">
                <Button>Commencer l'essai gratuit</Button>
              </Link>
              <Link to="/pricing">
                <Button variant="secondary">Voir les packs</Button>
              </Link>
            </div>
          </div>
          <div className="rounded-lg border border-border bg-surface p-5">
            <div className="german rounded-md bg-white p-5" dir="ltr">
              <p className="text-sm text-muted">Schreiben Training</p>
              <p className="mt-3 text-lg font-semibold">Sehr geehrte Damen und Herren,</p>
              <p className="mt-2 text-sm leading-6">
                ich schreibe Ihnen, weil ich mich über den Kurs informieren möchte. Können Sie mir bitte die Termine und
                Preise schicken?
              </p>
            </div>
          </div>
        </section>
        <section className="mx-auto grid max-w-6xl gap-4 px-4 pb-16 md:grid-cols-3">
          {['Exercices ciblés', 'Correction IA', 'Paiement manuel'].map((title, index) => (
            <Card key={title}>
              <h2 className="font-bold">{title}</h2>
              <p className="mt-2 text-sm text-muted">
                {index === 0 && 'Travaille par module: Lesen, Hören et Schreiben.'}
                {index === 1 && 'La correction IA reste côté backend. Aucune clé IA dans le navigateur.'}
                {index === 2 && 'L’utilisateur reçoit un lien WhatsApp avec Payment ID et infos CIH.'}
              </p>
            </Card>
          ))}
        </section>
      </main>
      <Footer />
    </div>
  );
}
