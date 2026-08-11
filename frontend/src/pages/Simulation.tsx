import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { apiClient, type SimulationSession } from '../lib/api';
import { formatDate } from '../lib/utils';

const skillLabels = { reading: 'Lesen', listening: 'Hören', writing: 'Schreiben' };

export function Simulation() {
  const queryClient = useQueryClient(); const navigate = useNavigate(); const [now, setNow] = useState(Date.now());
  const catalog = useQuery({ queryKey: ['simulations'], queryFn: apiClient.simulations });
  const active = useQuery({ queryKey: ['simulation-active'], queryFn: apiClient.activeSimulation });
  const history = useQuery({ queryKey: ['simulation-history'], queryFn: apiClient.simulationHistory });
  const start = useMutation({ mutationFn: apiClient.startSimulation, onSuccess: (data) => queryClient.setQueryData(['simulation-active'], { session: data.session }) });
  const startModule = useMutation({ mutationFn: ({ sessionId, moduleId }: { sessionId: string; moduleId: string }) => apiClient.startSimulationModule(sessionId, moduleId), onSuccess: (data) => navigate(data.launchPath) });
  const completeModule = useMutation({ mutationFn: ({ sessionId, moduleId }: { sessionId: string; moduleId: string }) => apiClient.completeSimulationModule(sessionId, moduleId), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['simulation-active'] }); queryClient.invalidateQueries({ queryKey: ['simulation-history'] }); queryClient.invalidateQueries({ queryKey: ['progress'] }); } });

  useEffect(() => { const interval = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(interval); }, []);
  const session = active.data?.session;

  return <div className="space-y-6">
    <div><p className="text-xs font-black uppercase tracking-[0.16em] text-accent">Phase 3 · Conditions d’examen</p><h1 className="mt-2 text-3xl font-black">Simulation TELC</h1><p className="mt-2 max-w-2xl text-muted">Enchaînez les modules dans l’ordre. Le chronomètre global continue après avoir quitté cette page et la progression est conservée.</p></div>
    {session?.status === 'in_progress' ? <ActiveSimulation session={session} now={now} pending={startModule.isPending || completeModule.isPending} onStart={(moduleId) => startModule.mutate({ sessionId: session.id, moduleId })} onComplete={(moduleId) => completeModule.mutate({ sessionId: session.id, moduleId })} /> : <Card><h2 className="text-xl font-black">Simulations disponibles</h2><div className="mt-4 grid gap-4 md:grid-cols-2">{catalog.data?.simulations.map((simulation) => <article key={simulation.id} className="rounded-xl border border-border bg-white p-5"><div className="flex justify-between gap-3"><h3 className="font-black">{simulation.title}</h3><span className="rounded-full bg-accentSoft px-3 py-1 text-xs font-black text-accentDark">{simulation.level}</span></div><p className="mt-2 text-sm text-muted">{simulation.durationMinutes} minutes · Lesen, Hören et Schreiben</p>{simulation.instructions && <p className="mt-3 text-sm leading-6 text-muted">{simulation.instructions}</p>}<Button className="mt-4" disabled={start.isPending} onClick={() => { if (window.confirm(`Démarrer une simulation chronométrée de ${simulation.durationMinutes} minutes ?`)) start.mutate(simulation.id); }}>Démarrer</Button></article>)}</div>{catalog.data && !catalog.data.simulations.length && <p className="mt-4 rounded-xl bg-bg p-4 text-sm text-muted">Aucune simulation publiée. Un éditeur doit assembler et publier un blueprint depuis l’administration.</p>}</Card>}
    {(start.error || startModule.error || completeModule.error) && <Card className="border-red-200"><p className="text-sm text-red-600">{start.error?.message ?? startModule.error?.message ?? completeModule.error?.message}</p></Card>}
    <Card><h2 className="text-xl font-black">Historique</h2><div className="mt-4 space-y-3">{history.data?.history.map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-white p-4"><div><p className="font-bold">{item.title} · {item.level}</p><p className="mt-1 text-xs text-muted">{formatDate(item.startedAt)} · {item.status}</p></div><strong>{item.percentage == null ? '—' : `${Math.round(item.percentage)}%`}</strong></div>)}{history.data && !history.data.history.length && <p className="text-sm text-muted">Aucune simulation précédente.</p>}</div></Card>
  </div>;
}

function ActiveSimulation({ session, now, pending, onStart, onComplete }: { session: SimulationSession; now: number; pending: boolean; onStart: (id: string) => void; onComplete: (id: string) => void }) {
  const remaining = Math.max(0, Math.floor((new Date(session.expiresAt).getTime() - now) / 1000)); const hours = Math.floor(remaining / 3600); const minutes = Math.floor((remaining % 3600) / 60); const seconds = remaining % 60;
  return <Card className="border-accent/30"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[0.14em] text-accent">Simulation en cours</p><h2 className="mt-2 text-2xl font-black">{session.title}</h2></div><div className={`rounded-xl px-4 py-3 text-center ${remaining < 600 ? 'bg-red-50 text-red-700' : 'bg-ink text-white'}`}><p className="text-xs font-bold uppercase">Temps restant</p><p className="mt-1 font-mono text-2xl font-black">{hours.toString().padStart(2, '0')}:{minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}</p></div></div><ol className="mt-6 space-y-3">{session.modules.map((module) => <li key={module.id} className="flex flex-col gap-3 rounded-xl border border-border bg-white p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-black">{module.orderIndex + 1}. {skillLabels[module.skill]} · {module.title}</p><p className="mt-1 text-xs text-muted">{module.durationMinutes} min · {module.resultStatus === 'locked' ? 'Verrouillé' : module.resultStatus === 'available' ? 'Prêt' : module.resultStatus === 'in_progress' ? 'À terminer' : `Terminé · ${Math.round(module.percentage ?? 0)}%`}</p></div>{module.resultStatus === 'available' && <Button disabled={pending || remaining === 0} onClick={() => onStart(module.id)}>Commencer</Button>}{module.resultStatus === 'in_progress' && <div className="flex gap-2"><Button variant="secondary" disabled={pending} onClick={() => onStart(module.id)}>Reprendre</Button><Button disabled={pending} onClick={() => onComplete(module.id)}>Valider le module</Button></div>}</li>)}</ol></Card>;
}
