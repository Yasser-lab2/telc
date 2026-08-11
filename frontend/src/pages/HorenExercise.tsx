import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AudioPlayer } from '../components/exercise/AudioPlayer';
import { Card } from '../components/ui/Card';
import { apiClient } from '../lib/api';

type ListeningResult = Awaited<ReturnType<typeof apiClient.submitListeningAttempt>>;

export function HorenExercise() {
  const { audioId = '' } = useParams();
  const queryClient = useQueryClient();
  const audio = useQuery({ queryKey: ['horen', audioId], queryFn: () => apiClient.horenAudio(audioId) });
  const active = useQuery({ queryKey: ['listening-active', audioId], queryFn: () => apiClient.activeListeningSession(audioId) });
  const history = useQuery({ queryKey: ['listening-history', audioId], queryFn: () => apiClient.listeningHistory(audioId) });
  const attemptRef = useRef<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [playCount, setPlayCount] = useState(0);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [result, setResult] = useState<ListeningResult | null>(null);

  useEffect(() => {
    if (!active.data?.attempt || attemptRef.current) return;
    attemptRef.current = active.data.attempt.id;
    setPlayCount(active.data.playCount);
    setAnswers(Object.fromEntries(active.data.answers.filter((answer) => answer.selectedOptionCode).map((answer) => [answer.questionId, answer.selectedOptionCode!] )));
    setSaveStatus('saved');
  }, [active.data]);

  async function ensureAttempt() {
    if (attemptRef.current) return attemptRef.current;
    const { attempt } = await apiClient.startListeningAttempt(audioId);
    attemptRef.current = attempt.id;
    return attempt.id;
  }

  const save = useMutation({
    mutationFn: async () => {
      const id = await ensureAttempt();
      const rows = Object.entries(answers).map(([questionId, selectedOptionCode]) => ({ questionId, selectedOptionCode }));
      if (rows.length) await apiClient.saveListeningAnswers(id, rows);
    },
    onSuccess: () => setSaveStatus('saved'), onError: () => setSaveStatus('error'),
  });
  useEffect(() => {
    if (!Object.keys(answers).length || result) return;
    setSaveStatus('saving');
    const timer = window.setTimeout(() => save.mutate(), 700);
    return () => window.clearTimeout(timer);
  }, [answers, result]);

  const play = useMutation({
    mutationFn: async () => apiClient.registerListeningPlay(await ensureAttempt()),
    onSuccess: (data) => setPlayCount(data.playCount),
  });
  const submit = useMutation({
    mutationFn: async () => { await save.mutateAsync(); return apiClient.submitListeningAttempt((await ensureAttempt())); },
    onSuccess: (data) => {
      setResult(data); setSaveStatus('saved');
      queryClient.setQueryData(['listening-active', audioId], { attempt: null, answers: [], playCount: 0, maxPlays: audio.data?.audio.maxPlays ?? 2 });
      queryClient.invalidateQueries({ queryKey: ['listening-history', audioId] });
      queryClient.invalidateQueries({ queryKey: ['progress'] });
    },
  });

  if (!audio.data) return <p>Chargement...</p>;
  const remainingPlays = Math.max(0, audio.data.audio.maxPlays - playCount);
  const answered = Object.keys(answers).length;

  async function retry() {
    attemptRef.current = null; setAnswers({}); setPlayCount(0); setResult(null); setSaveStatus('idle');
    await ensureAttempt();
  }

  return <div className="space-y-5">
    <div><p className="text-xs font-extrabold uppercase tracking-[0.18em] text-accent">Hören · {audio.data.audio.niveau}</p><h1 className="german mt-2 text-3xl font-black text-ink" dir="ltr">{audio.data.audio.title}</h1></div>
    <Card><AudioPlayer src={audio.data.audio.audioUrl} remainingPlays={remainingPlays} onAuthorizePlay={() => play.mutateAsync().then(() => undefined)} />{play.error && <p className="mt-3 text-sm text-red-600">{play.error.message}</p>}</Card>
    <Card>
      <div className="mb-5 flex items-center justify-between gap-3"><p className="text-sm font-bold text-ink">{answered}/{audio.data.audio.questions.length} questions répondues</p><span aria-live="polite" className={`text-xs font-bold ${saveStatus === 'error' ? 'text-red-600' : 'text-muted'}`}>{saveStatus === 'saving' ? 'Enregistrement…' : saveStatus === 'saved' ? 'Réponses enregistrées' : saveStatus === 'error' ? 'Échec de sauvegarde' : ''}</span></div>
      <div className="space-y-5">{audio.data.audio.questions.map((question) => { const correction = result?.corrections.find((item) => item.questionId === question.id); return <div key={question.id} className="rounded-xl border border-border bg-bg/50 p-4"><div className="flex items-start justify-between gap-3"><p className="german font-bold text-ink" dir="ltr">{question.prompt}</p>{correction && <span className={`rounded-full px-3 py-1 text-xs font-black ${correction.isCorrect ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{correction.isCorrect ? 'Correct' : `Réponse: ${correction.correctOptionCode}`}</span>}</div><div className="mt-3 grid gap-2 sm:grid-cols-3">{question.options.map((option) => <button key={option.code} type="button" disabled={Boolean(result)} onClick={() => setAnswers((current) => ({ ...current, [question.id]: option.code }))} className={`rounded-xl border px-3 py-3 text-left text-sm ${answers[question.id] === option.code ? 'border-accent bg-accentSoft text-ink' : 'border-border bg-white text-muted'}`}><span className="font-black">{option.code}</span> · {option.label}</button>)}</div>{correction && <p className="mt-3 rounded-lg bg-white p-3 text-sm text-muted">{!correction.selectedOptionCode && <span className="font-bold text-amber-700">Sans réponse. </span>}{correction.explanation ?? 'Aucune explication supplémentaire.'}</p>}</div>; })}</div>
      {(submit.error || save.error) && <p className="mt-4 text-sm text-red-600">{submit.error?.message ?? save.error?.message}</p>}
      {!result ? <button type="button" disabled={submit.isPending} onClick={() => { const missing = audio.data.audio.questions.length - answered; if (missing > 0 && !window.confirm(`${missing} question(s) sans réponse. Soumettre quand même ?`)) return; submit.mutate(); }} className="mt-5 min-h-11 rounded-xl bg-accent px-5 text-sm font-black text-white disabled:opacity-50">{submit.isPending ? 'Correction…' : 'Soumettre et corriger'}</button> : <div className="mt-6 border-t border-border pt-5"><h2 className="text-2xl font-black text-ink">Résultat: {result.score}/{result.scoreMax} · {result.percentage}%</h2><div className="german mt-4 rounded-xl bg-bg p-4" dir="ltr"><p className="text-xs font-black uppercase text-muted">Transkript</p><p className="mt-2 leading-7 text-ink">{result.transcript}</p></div><div className="mt-4 flex flex-wrap gap-3"><button type="button" onClick={() => void retry()} className="min-h-11 rounded-xl bg-ink px-5 text-sm font-black text-white">Réessayer</button><Link to="/dashboard/horen" className="inline-flex min-h-11 items-center rounded-xl border border-border px-5 text-sm font-bold text-ink">Retour aux exercices</Link></div></div>}
    </Card>
    {history.data?.history.length ? <Card><h2 className="text-xl font-black text-ink">Historique</h2><div className="mt-4 space-y-2">{history.data.history.slice(0, 5).map((item) => <div key={item.id} className="flex items-center justify-between rounded-xl border border-border p-3"><span className="text-sm text-muted">{new Date(item.submittedAt).toLocaleDateString('fr-FR')}</span><span className="font-black text-accent">{Math.round(item.percentage)}%</span></div>)}</div></Card> : null}
  </div>;
}
