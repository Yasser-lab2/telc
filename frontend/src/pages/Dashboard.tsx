import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useUsage } from '../hooks/useUsage';
import { formatDate } from '../lib/utils';

type StatCardProps = {
  label: string;
  value: string;
  hint: string;
  tone: 'teal' | 'blue' | 'violet' | 'amber';
};

type SkillProgressCardProps = {
  title: string;
  route: string;
  cta: string;
  percent: number;
  total: number;
  done: number;
  review: number;
  tone: 'blue' | 'violet' | 'amber';
  icon: JSX.Element;
};

const toneMap = {
  teal: 'from-teal-400/20 to-emerald-400/5 text-teal-200 border-teal-300/20',
  blue: 'from-blue-400/20 to-cyan-400/5 text-blue-200 border-blue-300/20',
  violet: 'from-violet-400/20 to-fuchsia-400/5 text-violet-200 border-violet-300/20',
  amber: 'from-amber-400/20 to-orange-400/5 text-amber-200 border-amber-300/20',
};

const skills: SkillProgressCardProps[] = [
  {
    title: 'Lesen',
    route: '/dashboard/lesen',
    cta: 'Continuer Lesen',
    percent: 18,
    total: 12,
    done: 3,
    review: 1,
    tone: 'blue',
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v16H6.5A2.5 2.5 0 0 0 4 21.5v-16Z" />
        <path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H13v16h4.5a2.5 2.5 0 0 1 2.5 2.5v-16Z" />
      </svg>
    ),
  },
  {
    title: 'Hören',
    route: '/dashboard/horen',
    cta: 'Continuer Hören',
    percent: 8,
    total: 10,
    done: 1,
    review: 1,
    tone: 'violet',
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M5 14v-2a7 7 0 0 1 14 0v2" />
        <path d="M5 14h3v5H6a1 1 0 0 1-1-1v-4Z" />
        <path d="M19 14h-3v5h2a1 1 0 0 0 1-1v-4Z" />
      </svg>
    ),
  },
  {
    title: 'Schreiben',
    route: '/dashboard/schreiben',
    cta: 'Pratiquer Schreiben',
    percent: 0,
    total: 8,
    done: 0,
    review: 1,
    tone: 'amber',
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M4 20h4l10.5-10.5a2.8 2.8 0 0 0-4-4L4 16v4Z" />
        <path d="m13.5 6.5 4 4" />
      </svg>
    ),
  },
];

const activities = [
  { title: 'Schreiben: Brief formel', meta: 'Aujourd’hui', status: 'En cours', tone: 'amber' },
  { title: 'Hören: Teil 1', meta: '26.03', status: 'À revoir', tone: 'violet' },
  { title: 'Lesen: Alex und Cora', meta: '26.03', status: 'Terminé', tone: 'blue' },
];

export function Dashboard() {
  const { user, subscription } = useAuth();
  const usage = useUsage();
  const niveau = user?.niveau?.replace('_', ' + ') ?? 'B1';
  const planName = subscription?.isActive ? subscription.planName : 'Essai';
  const expiry = subscription?.isActive ? formatDate(subscription.expiresAt) : 'Non actif';
  const remaining = usage.data ? `${usage.data.remaining}/${usage.data.limit}` : '...';

  return (
    <div className="space-y-8">
      <section className="grid gap-4 lg:grid-cols-[1fr_0.9fr] lg:items-end">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Progression globale" value="12%" hint="Objectif hebdo" tone="teal" />
          <StatCard label="Niveau" value={niveau} hint="TELC B1/B2" tone="blue" />
          <StatCard label="Plan actuel" value={planName} hint={expiry} tone="violet" />
          <StatCard label="Corrections IA" value={remaining} hint="Restantes aujourd'hui" tone="amber" />
        </div>

        <div className="rounded-[24px] border border-white/10 bg-gradient-to-br from-white/[0.08] to-white/[0.03] p-6 text-right shadow-2xl shadow-black/30">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-teal-200/70">Dashboard</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-white md:text-5xl">Bonjour {user?.displayName}</h1>
          <p className="mt-3 text-base text-slate-400">Pret pour ton entrainement TELC B1/B2.</p>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-3">
        {skills.map((skill) => (
          <SkillProgressCard key={skill.title} {...skill} />
        ))}
      </section>

      <section className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="grid gap-5 sm:grid-cols-2">
          <InfoCard title="Simulation" value="Mode examen" body="Lance un parcours mixte quand tu veux t'entrainer en conditions reelles." to="/dashboard/simulation" />
          <InfoCard title="Abonnement" value={planName} body={`Expire: ${expiry}`} to="/pricing" />
          <InfoCard title="Corrections IA" value={remaining} body="Quota journalier selon ton plan actuel." to="/dashboard/schreiben" />
          <InfoCard title="Prochaine étape" value="Schreiben" body="Travaille une lettre courte et demande une correction." to="/dashboard/schreiben" />
        </div>
        <ActivityCard />
      </section>
    </div>
  );
}

function StatCard({ label, value, hint, tone }: StatCardProps) {
  return (
    <div className={`rounded-[22px] border bg-gradient-to-br p-5 shadow-xl shadow-black/25 ${toneMap[tone]}`}>
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="truncate text-2xl font-black text-white">{value}</p>
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/10 text-sm">{tone === 'teal' ? '↗' : tone === 'blue' ? 'B1' : tone === 'violet' ? '★' : 'AI'}</span>
      </div>
      <p className="mt-2 truncate text-xs text-slate-400">{hint}</p>
    </div>
  );
}

function SkillProgressCard({ title, route, cta, percent, total, done, review, tone, icon }: SkillProgressCardProps) {
  return (
    <Link
      to={route}
      className="group block rounded-[24px] border border-white/10 bg-[#12151d]/90 p-6 shadow-2xl shadow-black/30 transition hover:-translate-y-1 hover:border-teal-300/30 hover:bg-[#151a24]"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className={`grid h-12 w-12 place-items-center rounded-2xl border bg-gradient-to-br ${toneMap[tone]}`}>{icon}</span>
          <h2 className="text-xl font-black text-white">{title}</h2>
        </div>
        <div className="text-right">
          <p className="text-3xl font-black text-white">{percent}%</p>
          <p className="text-xs font-semibold text-slate-500">progression</p>
        </div>
      </div>

      <div className="mt-6 h-2 overflow-hidden rounded-full bg-slate-800">
        <div className="h-full rounded-full bg-gradient-to-r from-teal-300 to-blue-400" style={{ width: `${percent}%` }} />
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2 rounded-2xl border border-white/8 bg-black/20 p-3 text-sm">
        <Metric label="Réussis" value={done} tone="text-emerald-300" />
        <Metric label="À revoir" value={review} tone="text-red-300" />
        <Metric label="Total" value={total} tone="text-slate-300" />
      </div>

      <span className="mt-5 flex min-h-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm font-bold text-slate-200 transition group-hover:border-teal-300/40 group-hover:bg-teal-300/10 group-hover:text-white">
        {cta}
      </span>
    </Link>
  );
}

function Metric({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div>
      <p className={`font-black ${tone}`}>{value}</p>
      <p className="mt-1 text-[11px] font-semibold text-slate-500">{label}</p>
    </div>
  );
}

function InfoCard({ title, value, body, to }: { title: string; value: string; body: string; to: string }) {
  return (
    <Link
      to={to}
      className="rounded-[22px] border border-white/10 bg-[#12151d]/85 p-5 shadow-xl shadow-black/25 transition hover:-translate-y-0.5 hover:border-teal-300/30 hover:bg-[#151a24]"
    >
      <p className="text-sm font-bold text-slate-400">{title}</p>
      <p className="mt-3 truncate text-2xl font-black text-white">{value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-500">{body}</p>
    </Link>
  );
}

function ActivityCard() {
  return (
    <section className="rounded-[24px] border border-white/10 bg-[#12151d]/90 p-6 shadow-2xl shadow-black/30">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-2xl font-black text-white">Activité récente</h2>
        <span className="rounded-full border border-white/10 px-3 py-1 text-xs font-bold text-slate-400">Local</span>
      </div>
      <div className="mt-6 space-y-3">
        {activities.map((activity) => (
          <div key={activity.title} className="flex items-center justify-between gap-4 rounded-2xl border border-white/8 bg-black/20 p-4">
            <div>
              <p className="font-bold text-white">{activity.title}</p>
              <p className="mt-1 text-xs text-slate-500">{activity.meta}</p>
            </div>
            <span className={`rounded-full border px-3 py-1 text-xs font-bold ${toneMap[activity.tone as keyof typeof toneMap]}`}>
              {activity.status}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
