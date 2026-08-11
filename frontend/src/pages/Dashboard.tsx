import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useUsage } from '../hooks/useUsage';
import { formatDate } from '../lib/utils';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api';

const skills = [
  { title: 'Lesen', label: 'Compréhension écrite', route: '/dashboard/lesen', icon: 'L' },
  { title: 'Hören', label: 'Compréhension orale', route: '/dashboard/horen', icon: 'H' },
  { title: 'Schreiben', label: 'Expression écrite avec correction IA', route: '/dashboard/schreiben', icon: 'S' },
];

export function Dashboard() {
  const { user, subscription } = useAuth();
  const usage = useUsage();
  const learning = useQuery({ queryKey: ['progress'], queryFn: apiClient.progress });
  const level = user?.niveau?.replace('_', ' + ') ?? 'B1';
  const planName = subscription?.isActive ? subscription.planName : 'Aucun plan actif';
  const expiry = subscription?.isActive ? formatDate(subscription.expiresAt) : '—';
  const remaining = usage.data ? `${usage.data.remaining} sur ${usage.data.limit}` : 'Chargement…';

  return (
    <div className="space-y-8">
      <section className="grid gap-6 rounded-3xl border border-border bg-surface p-6 shadow-sm md:p-8 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-accent">Votre espace d’entraînement</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-ink md:text-5xl">Bonjour {user?.displayName}</h1>
          <p className="mt-3 max-w-2xl text-muted">Choisissez une compétence pour commencer une session TELC {level}.</p>
        </div>
        <Link to="/dashboard/lesen" className="inline-flex min-h-12 items-center justify-center rounded-xl bg-accent px-6 text-sm font-extrabold text-white transition hover:bg-accentDark">
          Commencer un exercice
        </Link>
      </section>

      <section aria-label="Résumé du compte" className="grid gap-4 sm:grid-cols-3">
        <SummaryCard label="Niveau préparé" value={level} hint="Modifiable depuis votre profil" />
        <SummaryCard label="Plan actuel" value={planName} hint={`Expiration : ${expiry}`} />
        <SummaryCard label="Corrections IA restantes" value={remaining} hint="Quota renouvelé chaque jour" />
      </section>

      <section>
        <div className="flex items-end justify-between gap-4">
          <div><p className="text-xs font-extrabold uppercase tracking-[0.18em] text-accent">Pratique ciblée</p><h2 className="mt-2 text-2xl font-black text-ink">Choisissez une compétence</h2></div>
        </div>
        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          {skills.map((skill) => (
            <Link key={skill.title} to={skill.route} className="group rounded-2xl border border-border bg-surface p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-md">
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-accentSoft text-lg font-black text-accentDark">{skill.icon}</span>
              <h3 className="mt-5 text-xl font-black text-ink">{skill.title}</h3>
              <p className="mt-2 min-h-12 text-sm leading-6 text-muted">{skill.label}</p>
              <span className="mt-5 inline-flex items-center gap-2 text-sm font-extrabold text-accent">Ouvrir le module <span aria-hidden="true">→</span></span>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[1fr_0.72fr]">
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <h2 className="text-xl font-black text-ink">Progression</h2>
          {learning.data?.progress.length ? <div className="mt-5 space-y-3">{learning.data.progress.map((item) => <div key={item.id} className="flex items-center justify-between rounded-xl border border-border bg-bg/60 p-4"><div><p className="font-bold capitalize text-ink">{item.skill} · {item.level}</p><p className="mt-1 text-xs text-muted">{item.completedAttempts} tentative(s) terminée(s)</p></div><div className="text-right"><p className="text-xl font-black text-accent">{Math.round(item.averagePercentage ?? 0)}%</p><p className="text-xs text-muted">Moyenne</p></div></div>)}</div> :
          <div className="mt-5 rounded-xl border border-dashed border-border bg-bg/60 p-6 text-center"><p className="font-bold text-ink">Votre progression apparaîtra ici</p><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">Terminez vos premiers exercices. Les scores et l’historique seront calculés à partir de vos vraies tentatives.</p></div>}
          {learning.data?.recentActivity.length ? <div className="mt-7 border-t border-border pt-6"><h3 className="font-black text-ink">Activité récente</h3><div className="mt-3 space-y-2">{learning.data.recentActivity.map((item) => <div key={item.id} className="flex items-center justify-between gap-4 rounded-xl px-3 py-2 hover:bg-bg"><div><p className="text-sm font-bold text-ink">{item.title}</p><p className="mt-1 text-xs capitalize text-muted">{item.skill} · {new Date(item.occurredAt).toLocaleDateString('fr-FR')}</p></div><span className="shrink-0 rounded-full bg-accentSoft px-3 py-1 text-xs font-black text-accentDark">{Math.round(item.score ?? 0)}%</span></div>)}</div></div> : null}
        </div>
        <Link to="/dashboard/simulation" className="rounded-2xl border border-border bg-ink p-6 text-white shadow-sm transition hover:-translate-y-0.5">
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-teal-200">Bientôt disponible</p>
          <h2 className="mt-3 text-2xl font-black">Simulation complète</h2>
          <p className="mt-3 text-sm leading-6 text-slate-300">Le mode examen chronométré sera activé lorsque le contenu et la sauvegarde des tentatives seront prêts.</p>
        </Link>
      </section>
    </div>
  );
}

function SummaryCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm"><p className="text-xs font-extrabold uppercase tracking-[0.14em] text-muted">{label}</p><p className="mt-3 truncate text-2xl font-black text-ink">{value}</p><p className="mt-2 truncate text-xs text-muted">{hint}</p></div>;
}
