import { Link, useParams } from 'react-router-dom';
import { Footer } from '../components/layout/Footer';
import { Navbar } from '../components/layout/Navbar';

type DocumentKey = 'privacy' | 'terms' | 'refunds';

const documents: Record<DocumentKey, { title: string; intro: string; sections: Array<{ title: string; body: JSX.Element }> }> = {
  privacy: {
    title: 'Politique de confidentialité',
    intro: 'Cette politique explique quelles données TELC Prep utilise, pourquoi elles sont nécessaires et quels contrôles sont proposés aux apprenants.',
    sections: [
      { title: 'Données traitées', body: <p>Nous traitons les informations du compte, le niveau choisi, les sessions techniques, les abonnements et paiements, les réponses aux exercices, les résultats, les textes envoyés pour correction et les préférences. Les preuves de paiement sont conservées dans un stockage privé.</p> },
      { title: 'Finalités', body: <p>Ces données servent à authentifier le compte, fournir et améliorer les exercices, sauvegarder la progression, évaluer les productions, gérer les abonnements et paiements, prévenir les abus et assurer le support.</p> },
      { title: 'Prestataires et transferts', body: <p>L’hébergement Cloudflare et, lorsque la correction IA est utilisée, Google Gemini peuvent traiter les données nécessaires à la fourniture du service. L’exploitant doit documenter et autoriser les éventuels transferts internationaux avant le lancement commercial.</p> },
      { title: 'Durée et sécurité', body: <p>Les données sont conservées pendant la vie du compte et selon les obligations légales applicables. Les mots de passe sont hachés, les sessions utilisent des cookies httpOnly et les preuves de paiement ne sont pas publiques. Une politique détaillée de conservation doit être validée avant lancement.</p> },
      { title: 'Vos droits', body: <p>Le profil permet de rectifier, exporter ou supprimer les données du compte. La loi marocaine n°09-08 prévoit notamment des droits d’accès, de rectification et, pour motifs légitimes, d’opposition. Une réclamation peut être adressée à la CNDP.</p> },
    ],
  },
  terms: {
    title: 'Conditions d’utilisation',
    intro: 'Ces conditions encadrent l’accès à TELC Prep et à ses contenus de préparation linguistique.',
    sections: [
      { title: 'Service', body: <p>TELC Prep propose des exercices B1/B2, un suivi de progression et des retours pédagogiques. Le service est un outil de préparation : il ne garantit ni l’inscription, ni la réussite, ni un score officiel à l’examen TELC.</p> },
      { title: 'Compte', body: <p>Vous devez fournir des informations exactes, protéger votre mot de passe et signaler tout accès non autorisé. Un compte est personnel. Les usages frauduleux, automatisés ou portant atteinte au service peuvent être suspendus.</p> },
      { title: 'Contenus et IA', body: <p>Les corrections automatiques sont des indications pédagogiques susceptibles de contenir des erreurs. Elles ne remplacent pas l’évaluation d’un examinateur qualifié. Les contenus et marques de tiers restent la propriété de leurs titulaires.</p> },
      { title: 'Abonnements', body: <p>Le prix, la durée et les fonctionnalités du pack sont présentés avant la demande de paiement. Le processus manuel actuel ne déclenche aucun renouvellement automatique. L’accès commence après validation du paiement.</p> },
      { title: 'Responsabilité et évolution', body: <p>Nous cherchons à maintenir un service fiable, sans promettre une disponibilité ininterrompue. Les modifications importantes des conditions doivent être communiquées et faire l’objet d’un nouveau consentement lorsque nécessaire.</p> },
    ],
  },
  refunds: {
    title: 'Politique de remboursement',
    intro: 'Cette politique décrit le traitement des demandes liées aux paiements manuels et n’écarte aucun droit impératif prévu par la loi applicable.',
    sections: [
      { title: 'Avant validation', body: <p>Une demande de paiement en attente ou rejetée n’active pas d’abonnement. TELC Prep ne réalise aucun prélèvement automatique. Si un virement a été effectué mais n’apparaît pas, transmettez le Payment ID et la preuve via le canal officiel de support.</p> },
      { title: 'Demande de remboursement', body: <p>Après validation, contactez rapidement le support avec l’adresse du compte, le Payment ID, la date, le montant et le motif. La demande est examinée selon l’utilisation du service, la preuve du paiement et les règles légales applicables.</p> },
      { title: 'Droits du consommateur', body: <p>La loi marocaine n°31-08 prévoit notamment un droit à l’information et, dans certains cas, un délai de rétractation de sept jours. Les exceptions éventuellement applicables aux services ou contenus numériques doivent être confirmées par l’exploitant avant commercialisation.</p> },
      { title: 'Traitement', body: <p>Une décision et, le cas échéant, les modalités de remboursement sont communiquées par le support. Les délais bancaires ou de virement dépendent ensuite des établissements concernés.</p> },
    ],
  },
};

export function Legal() {
  const { document = 'terms' } = useParams();
  const key = (document in documents ? document : 'terms') as DocumentKey;
  const page = documents[key];
  return (
    <div className="app-canvas min-h-screen" dir="ltr">
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 py-12 md:px-6 md:py-16">
        <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-accent">Informations légales</p>
        <h1 className="mt-3 text-3xl font-black md:text-4xl">{page.title}</h1>
        <p className="mt-3 text-sm text-muted">Version du 10 août 2026</p>
        <p className="mt-6 text-lg leading-8 text-muted">{page.intro}</p>
        <div className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Avant le lancement commercial, renseigner l’identité, l’adresse et le contact officiel de l’exploitant, puis faire valider ce document et les formalités CNDP par un professionnel compétent.</div>
        <div className="mt-10 space-y-8">{page.sections.map((section) => <section key={section.title}><h2 className="text-xl font-black">{section.title}</h2><div className="mt-3 leading-7 text-muted">{section.body}</div></section>)}</div>
        <div className="mt-10 flex flex-wrap gap-4 border-t border-border pt-6 text-sm font-bold text-accent">
          <Link to="/legal/terms">Conditions</Link><Link to="/legal/privacy">Confidentialité</Link><Link to="/legal/refunds">Remboursements</Link>
          <a href="https://www.cndp.ma/vos-droits-en-matiere-de-protection-des-donnees-a-caractere-personnel/" target="_blank" rel="noreferrer">Droits CNDP</a>
          <a href="https://mcinet.gov.ma/fr/content/protection-consommateur/droits-garantis-aux-consommateurs" target="_blank" rel="noreferrer">Droits des consommateurs</a>
        </div>
      </main>
      <Footer />
    </div>
  );
}
