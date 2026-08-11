import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="border-t border-border bg-surface/60 px-4 py-8 text-center text-sm text-muted">
      <p><span className="font-bold text-ink">TELC Prep</span> · Préparation TELC B1/B2 pour les apprenants au Maroc.</p>
      <nav aria-label="Informations légales" className="mt-3 flex flex-wrap justify-center gap-x-5 gap-y-2">
        <Link className="hover:text-accent" to="/legal/terms">Conditions</Link>
        <Link className="hover:text-accent" to="/legal/privacy">Confidentialité</Link>
        <Link className="hover:text-accent" to="/legal/refunds">Remboursements</Link>
      </nav>
    </footer>
  );
}
