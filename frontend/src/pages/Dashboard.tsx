import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useUsage } from '../hooks/useUsage';
import { formatDate } from '../lib/utils';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
  const queryClient = useQueryClient();
  const refreshProgress = () => queryClient.invalidateQueries({ queryKey: ['progress'] });
  const updateGoal = useMutation({ mutationFn: apiClient.updateStudyGoal, onSuccess: refreshProgress });
  const reviewMistake = useMutation({ mutationFn: apiClient.reviewMistake, onSuccess: refreshProgress });
  const dismissRecommendation = useMutation({ mutationFn: apiClient.dismissRecommendation, onSuccess: refreshProgress });
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

      <section className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-extrabold uppercase tracking-[0.18em] text-accent">Plan de la semaine</p><h2 className="mt-2 text-xl font-black">{learning.data?.studyGoal.completed ?? 0} / {learning.data?.studyGoal.weeklyTarget ?? 3} sessions</h2></div><select aria-label="Objectif hebdomadaire" className="field max-w-24" value={learning.data?.studyGoal.weeklyTarget ?? 3} onChange={(event) => updateGoal.mutate(Number(event.target.value))}>{[1,2,3,4,5,6,7,10,14].map((value) => <option key={value} value={value}>{value}</option>)}</select></div><div className="mt-5 h-2 overflow-hidden rounded-full bg-border"><div className="h-full rounded-full bg-accent" style={{ width: `${Math.min(100, ((learning.data?.studyGoal.completed ?? 0) / (learning.data?.studyGoal.weeklyTarget ?? 3)) * 100)}%` }} /></div><p className="mt-3 text-sm text-muted">Chaque exercice ou simulation terminé compte une seule fois.</p></div>
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm"><p className="text-xs font-extrabold uppercase tracking-[0.18em] text-accent">Prochaine action</p>{learning.data?.recommendations[0] ? <><h2 className="mt-2 text-xl font-black">{learning.data.recommendations[0].title}</h2><p className="mt-2 text-sm leading-6 text-muted">{learning.data.recommendations[0].reason}</p><div className="mt-4 flex gap-3"><Link className="font-extrabold text-accent" to={learning.data.recommendations[0].route}>Commencer →</Link><button className="text-sm font-bold text-muted" onClick={() => dismissRecommendation.mutate(learning.data!.recommendations[0].id)}>Masquer</button></div></> : <p className="mt-3 text-sm text-muted">Terminez une activité pour recevoir une recommandation ciblée.</p>}</div>
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
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-teal-200">Préparation à l’examen</p>
          <h2 className="mt-3 text-2xl font-black">{learning.data?.readiness.score == null ? 'Score à construire' : `${Math.round(learning.data.readiness.score)} % prêt`}</h2>
          <p className="mt-3 text-sm leading-6 text-slate-300">{learning.data?.readiness.explanation ?? 'Votre score sera calculé uniquement à partir de vos résultats réels.'}</p>
          {learning.data?.readiness.score != null && <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-teal-300" style={{ width: `${Math.max(0, Math.min(100, learning.data.readiness.score))}%` }} /></div>}
          <p className="mt-4 text-xs font-bold text-slate-300">{learning.data?.readiness.confidence === 'reliable' ? 'Estimation fiable' : 'Estimation provisoire'} · {learning.data?.readiness.evidenceAttempts ?? 0} résultat(s)</p>
          <span className="mt-5 inline-flex text-sm font-extrabold text-teal-200">Ouvrir les simulations →</span>
        </Link>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm"><h2 className="text-xl font-black">Tendance récente</h2>{learning.data?.trends.length ? <div className="mt-4 flex h-40 items-end gap-2" aria-label="Évolution des scores">{[...learning.data.trends].reverse().slice(-10).map((item) => <div key={item.id} className="group flex min-w-0 flex-1 flex-col items-center justify-end"><span className="mb-1 text-[10px] font-bold text-muted">{Math.round(item.percentage ?? 0)}</span><div title={`${item.title}: ${Math.round(item.percentage ?? 0)} %`} className="w-full rounded-t bg-accent/80" style={{ height: `${Math.max(4, item.percentage ?? 0)}%` }} /></div>)}</div> : <p className="mt-4 text-sm text-muted">Les tendances apparaîtront après vos premières tentatives.</p>}</div>
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm"><div className="flex items-center justify-between"><h2 className="text-xl font-black">Carnet d’erreurs</h2><span className="text-xs font-bold text-muted">{learning.data?.mistakes.filter((item) => item.status === 'open').length ?? 0} à revoir</span></div>{learning.data?.mistakes.length ? <div className="mt-4 max-h-80 space-y-3 overflow-y-auto">{learning.data.mistakes.map((item) => <div key={item.id} className={`rounded-xl border p-4 ${item.status === 'reviewed' ? 'border-border bg-bg/50 opacity-70' : 'border-amber-200 bg-amber-50/60'}`}><div className="flex justify-between gap-3"><p className="text-sm font-bold">{item.prompt}</p><button className="shrink-0 text-xs font-extrabold text-accent" onClick={() => reviewMistake.mutate({ id: item.id, reviewed: item.status !== 'reviewed' })}>{item.status === 'reviewed' ? 'Rouvrir' : 'Révisée'}</button></div><p className="mt-2 text-xs text-muted">Votre réponse : {item.selectedAnswer ?? 'sans réponse'} · Réponse : {item.correctAnswer ?? '—'} · vue {item.occurrenceCount} fois</p>{item.explanation && <p className="mt-2 text-xs leading-5 text-text">{item.explanation}</p>}</div>)}</div> : <p className="mt-4 text-sm text-muted">Les réponses incorrectes de Lesen et Hören seront ajoutées automatiquement.</p>}</div>
      </section>
    </div>
  );
}

function SummaryCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm"><p className="text-xs font-extrabold uppercase tracking-[0.14em] text-muted">{label}</p><p className="mt-3 truncate text-2xl font-black text-ink">{value}</p><p className="mt-2 truncate text-xs text-muted">{hint}</p></div>;
}
