import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Dispatch, SetStateAction } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { apiClient, type ReadingQuestion, type ReadingSection, type ReadingSubmitResult } from '../lib/api';

const tabs = [
  { id: 'all', label: 'Prüfungen' },
  { id: 'teil1', label: 'Teil 1' },
  { id: 'teil2', label: 'Teil 2' },
  { id: 'teil3', label: 'Teil 3' },
  { id: 'sprach1', label: 'Sprach 1' },
  { id: 'sprach2', label: 'Sprach 2' },
] as const;
type PracticeScope = (typeof tabs)[number]['id'];
const practiceDurations: Record<PracticeScope, number> = { all: 90, teil1: 20, teil2: 20, teil3: 20, sprach1: 15, sprach2: 15 };

export function LesenExercise() {
  const { themeId = '' } = useParams();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const requestedSection = searchParams.get('section');
  const initialTab = tabs.some((tab) => tab.id === requestedSection) ? requestedSection as (typeof tabs)[number]['id'] : 'all';
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]['id']>(initialTab);
  const [sessionScope, setSessionScope] = useState<PracticeScope | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [result, setResult] = useState<ReadingSubmitResult | null>(null);
  const hydratedSession = useRef<string | null>(null);
  const exam = useQuery({ queryKey: ['reading-exam', themeId], queryFn: () => apiClient.readingExam(themeId) });
  const activeSession = useQuery({ queryKey: ['reading-active-session', themeId], queryFn: () => apiClient.activeReadingSession(themeId) });
  const history = useQuery({ queryKey: ['reading-history', themeId], queryFn: () => apiClient.readingHistory(themeId) });

  useEffect(() => {
    const recovered = activeSession.data?.session;
    if (!recovered || hydratedSession.current === recovered.id) return;
    hydratedSession.current = recovered.id;
    setSessionId(recovered.id);
    setStartedAt(recovered.startedAt);
    setSessionScope(recovered.practiceScope);
    setActiveTab(recovered.practiceScope);
    setAnswers(Object.fromEntries(activeSession.data?.answers.map((answer) => [answer.questionId, answer.selectedOptionCode]) ?? []));
    setSaveStatus('saved');
  }, [activeSession.data]);

  const start = useMutation({
    mutationFn: (scope: PracticeScope) => apiClient.startReadingExam(themeId, scope),
    onSuccess: (data) => {
      hydratedSession.current = data.session.id;
      setSessionId(data.session.id);
      setStartedAt(data.session.startedAt);
      setSessionScope(data.session.practiceScope);
      setActiveTab(data.session.practiceScope);
    },
  });
  const save = useMutation({
    mutationFn: (id: string) =>
      apiClient.saveReadingAnswers(
        id,
        Object.entries(answers).map(([questionId, selectedOptionCode]) => ({ questionId, selectedOptionCode })),
      ),
    onSuccess: () => setSaveStatus('saved'),
    onError: () => setSaveStatus('error'),
  });
  const submit = useMutation({
    mutationFn: async () => {
      const started = sessionId ? null : (await apiClient.startReadingExam(themeId, activeTab)).session;
      const id = sessionId ?? started!.id;
      setSessionId(id);
      if (started) setStartedAt(started.startedAt);
      if (started) setSessionScope(started.practiceScope);
      const answerRows = Object.entries(answers).map(([questionId, selectedOptionCode]) => ({ questionId, selectedOptionCode }));
      if (answerRows.length) await apiClient.saveReadingAnswers(id, answerRows);
      return apiClient.submitReadingSession(id);
    },
    onSuccess: (data) => {
      setResult(data);
      queryClient.setQueryData(['reading-active-session', themeId], { session: null, answers: [] });
      queryClient.invalidateQueries({ queryKey: ['progress'] });
      queryClient.invalidateQueries({ queryKey: ['reading-history', themeId] });
    },
  });

  useEffect(() => {
    if (!sessionId || result || Object.keys(answers).length === 0) return;
    setSaveStatus('saving');
    const timer = window.setTimeout(() => save.mutate(sessionId), 900);
    return () => window.clearTimeout(timer);
  }, [answers, result, sessionId]);

  const visibleSections = useMemo(() => {
    const sections = exam.data?.exam.sections ?? [];
    return activeTab === 'all' ? sections : sections.filter((section: ReadingSection) => section.sectionCode === activeTab);
  }, [activeTab, exam.data?.exam.sections]);

  const visibleQuestionIds = useMemo(() => new Set(visibleSections.flatMap((section) => section.questions.map((question) => question.id))), [visibleSections]);
  const totalQuestions = visibleSections.reduce((total, section) => total + section.questions.length, 0);
  const answeredQuestions = Object.keys(answers).filter((id) => visibleQuestionIds.has(id)).length;
  const effectiveScope = sessionScope ?? activeTab;
  const durationMinutes = effectiveScope === 'all' ? (exam.data?.exam.durationMinutes ?? 90) : practiceDurations[effectiveScope];
  const secondsRemaining = useCountdown(startedAt, durationMinutes, Boolean(sessionId) && !result);
  const expirySubmitted = useRef(false);
  useEffect(() => {
    if (sessionId && secondsRemaining === 0 && !result && !submit.isPending && !expirySubmitted.current) {
      expirySubmitted.current = true;
      submit.mutate();
    }
  }, [result, secondsRemaining, sessionId, submit.isPending]);

  if (exam.isLoading) return <p className="text-slate-400">Chargement...</p>;
  if (!exam.data) return <p className="text-red-300">Examen introuvable.</p>;

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-white/10 bg-gradient-to-br from-white/[0.08] to-white/[0.03] p-6 shadow-2xl shadow-black/30 md:p-8">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-teal-200/70">Leseverstehen</p>
        <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="german text-4xl font-black text-white md:text-6xl" dir="ltr">
              {exam.data.exam.title}
            </h1>
            <p className="mt-3 text-slate-400">
              {exam.data.exam.level} · {exam.data.exam.durationMinutes} min · {exam.data.exam.scoreMax} points
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-bold text-slate-300">{durationMinutes} min · {tabs.find((tab) => tab.id === effectiveScope)?.label}</span>
          {sessionId && <span className={`rounded-xl border px-4 py-3 text-sm font-black ${secondsRemaining < 300 ? 'border-red-300 bg-red-50 text-red-700' : 'border-border bg-surface text-ink'}`}>{formatCountdown(secondsRemaining)}</span>}
          <button
            type="button"
            onClick={() => start.mutate(activeTab)}
            disabled={start.isPending || Boolean(sessionId)}
            className="min-h-11 rounded-2xl border border-teal-300/30 bg-teal-300/10 px-5 text-sm font-black text-teal-100 transition hover:bg-teal-300/20 disabled:opacity-50"
          >
            {sessionId ? 'Session ouverte' : 'Commencer'}
          </button>
          </div>
        </div>
      </section>

      <div className="flex gap-2 overflow-x-auto rounded-[22px] border border-white/10 bg-[#10141d]/80 p-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            disabled={Boolean(sessionId) && tab.id !== sessionScope}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold transition ${
            activeTab === tab.id ? 'bg-white text-slate-950' : 'text-slate-400 hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-30'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="space-y-5">
        {visibleSections.map((section: ReadingSection) => (
          <SectionView key={section.id} section={section} answers={answers} setAnswers={setAnswers} result={result} />
        ))}
      </div>

      <section className="rounded-[24px] border border-white/10 bg-[#12151d]/90 p-5 shadow-xl shadow-black/25">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 text-sm"><span className="font-bold text-slate-300">{answeredQuestions}/{totalQuestions} questions répondues</span>{sessionId && <span aria-live="polite" className={`font-bold ${saveStatus === 'error' ? 'text-red-300' : 'text-slate-400'}`}>{saveStatus === 'saving' ? 'Enregistrement…' : saveStatus === 'saved' ? 'Réponses enregistrées' : saveStatus === 'error' ? 'Échec de sauvegarde' : ''}</span>}</div>
        {result ? (
          <ResultSummary result={result} onRetry={async () => {
            setResult(null); setAnswers({}); setSessionId(null); setStartedAt(null); setSessionScope(null); setSaveStatus('idle');
            hydratedSession.current = null; expirySubmitted.current = false;
            await start.mutateAsync(activeTab);
          }} />
        ) : (
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={async () => {
                const started = sessionId ? null : (await apiClient.startReadingExam(themeId, activeTab)).session;
                const id = sessionId ?? started!.id;
                setSessionId(id);
                if (started) setStartedAt(started.startedAt);
                if (started) setSessionScope(started.practiceScope);
                setSaveStatus('saving');
                save.mutate(id);
              }}
              className="min-h-11 rounded-2xl border border-white/10 bg-white/[0.04] px-5 text-sm font-bold text-slate-200 hover:bg-white/10"
            >
              Sauvegarder
            </button>
            <button
              type="button"
              onClick={() => {
                const missing = totalQuestions - answeredQuestions;
                if (missing > 0 && !window.confirm(`${missing} question(s) sans réponse. Voulez-vous vraiment soumettre ?`)) return;
                if (window.confirm('Après la soumission, vos réponses ne pourront plus être modifiées. Continuer ?')) submit.mutate();
              }}
              disabled={submit.isPending}
              className="min-h-11 rounded-2xl border border-teal-300/30 bg-teal-300/10 px-5 text-sm font-black text-teal-100 hover:bg-teal-300/20 disabled:opacity-50"
            >
              {submit.isPending ? 'Correction...' : 'Soumettre et corriger'}
            </button>
          </div>
        )}
      </section>
      <HistoryTrend history={history.data?.history ?? []} />
    </div>
  );
}

function ResultSummary({ result, onRetry }: { result: ReadingSubmitResult; onRetry: () => Promise<void> }) {
  const unanswered = result.corrections.filter((item) => !item.selectedOptionCode).length;
  return <div>
    <div className="grid gap-4 md:grid-cols-[auto_1fr] md:items-center"><div className="grid h-28 w-28 place-items-center rounded-full border-8 border-teal-300/30 bg-teal-300/10 text-center"><div><p className="text-3xl font-black text-white">{result.percentage}%</p><p className="text-[10px] font-bold uppercase text-slate-400">score</p></div></div><div><h2 className="text-2xl font-black text-white">Résultat: {result.score}/{result.scoreMax}</h2><p className="mt-2 text-sm text-slate-400">{unanswered ? `${unanswered} question(s) sans réponse.` : 'Toutes les questions ont reçu une réponse.'}</p></div></div>
    <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{result.sectionSummary.map((section) => <div key={section.sectionCode} className="rounded-xl border border-white/10 bg-black/20 p-3"><p className="text-xs font-bold uppercase text-slate-500">{section.sectionCode}</p><p className="mt-2 text-lg font-black text-white">{section.score}/{section.scoreMax}</p></div>)}</div>
    <div className="mt-6 flex flex-wrap gap-3"><button type="button" onClick={() => void onRetry()} className="min-h-11 rounded-xl bg-white px-5 text-sm font-black text-slate-950">Réessayer</button><Link to="/dashboard/lesen" className="inline-flex min-h-11 items-center rounded-xl border border-white/10 px-5 text-sm font-bold text-slate-200">Retour aux examens</Link></div>
  </div>;
}

function HistoryTrend({ history }: { history: Array<{ id: string; finishedAt: string; percentage: number }> }) {
  if (!history.length) return null;
  const chronological = history.slice(0, 5).reverse();
  return <section className="rounded-[24px] border border-white/10 bg-[#12151d]/90 p-5 shadow-xl shadow-black/25"><div className="flex items-end justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-200/70">Historique</p><h2 className="mt-2 text-xl font-black text-white">Évolution du score</h2></div><span className="text-xs text-slate-500">{history.length} tentative(s)</span></div><div className="mt-6 flex h-40 items-end gap-3">{chronological.map((attempt) => <div key={attempt.id} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-2"><span className="text-xs font-black text-slate-300">{Math.round(attempt.percentage)}%</span><div className="w-full max-w-16 rounded-t-lg bg-gradient-to-t from-accent to-teal-300" style={{ height: `${Math.max(6, attempt.percentage)}%` }} /><span className="text-[10px] text-slate-500">{new Date(attempt.finishedAt).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}</span></div>)}</div></section>;
}

function useCountdown(startedAt: string | null, durationMinutes: number, active: boolean) {
  const calculate = () => !startedAt ? durationMinutes * 60 : Math.max(0, durationMinutes * 60 - Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
  const [remaining, setRemaining] = useState(calculate);
  useEffect(() => {
    setRemaining(calculate());
    if (!active) return;
    const timer = window.setInterval(() => setRemaining(calculate()), 1000);
    return () => window.clearInterval(timer);
  }, [active, durationMinutes, startedAt]);
  return remaining;
}

function formatCountdown(seconds: number) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
  const remainder = (seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${remainder}`;
}

function SectionView({
  section,
  answers,
  setAnswers,
  result,
}: {
  section: ReadingSection;
  answers: Record<string, string>;
  setAnswers: Dispatch<SetStateAction<Record<string, string>>>;
  result: ReadingSubmitResult | null;
}) {
  const extra = (section.extraData ?? {}) as { titles?: Array<{ code: string; text: string }>; ads?: Array<{ code: string; text: string }>; wordBank?: Array<{ code: string; text: string }> };

  return (
    <article className="rounded-[24px] border border-white/10 bg-[#12151d]/90 p-5 shadow-xl shadow-black/25">
      <div className="flex flex-col gap-2 border-b border-white/10 pb-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="german text-2xl font-black text-white" dir="ltr">{section.title}</h2>
          <p className="mt-2 text-sm text-slate-400">{section.instructions}</p>
        </div>
        <span className="text-sm font-bold text-slate-500">{section.pointsMax} points</span>
      </div>

      {section.mainText && (
        <div className="german mt-5 whitespace-pre-wrap rounded-2xl border border-white/10 bg-black/20 p-4 leading-7 text-slate-200" dir="ltr">
          {section.mainText}
        </div>
      )}

      {section.exerciseType === 'matching_titles' && extra.titles && <OptionBank title="Titres" items={extra.titles} />}
      {section.exerciseType === 'matching_ads' && extra.ads && <OptionBank title="Annonces" items={extra.ads} />}
      {section.exerciseType === 'gap_word_bank' && extra.wordBank && <OptionBank title="Word bank" items={extra.wordBank} />}

      <div className="mt-5 space-y-4">
        {section.questions.map((question) => (
          <QuestionView
            key={question.id}
            question={question}
            value={answers[question.id] ?? ''}
            onChange={(value) => setAnswers((current) => ({ ...current, [question.id]: value }))}
            correction={result?.corrections.find((item) => item.questionId === question.id)}
          />
        ))}
      </div>
    </article>
  );
}

function OptionBank({ title, items }: { title: string; items: Array<{ code: string; text: string }> }) {
  return (
    <div className="german mt-5 rounded-2xl border border-white/10 bg-black/20 p-4" dir="ltr">
      <p className="mb-3 text-sm font-black text-slate-300">{title}</p>
      <div className="grid gap-2 md:grid-cols-2">
        {items.map((item) => (
          <div key={item.code} className="rounded-xl bg-white/[0.04] p-3 text-sm text-slate-300">
            <span className="font-black text-white">{item.code}</span> · {item.text}
          </div>
        ))}
      </div>
    </div>
  );
}

function QuestionView({
  question,
  value,
  onChange,
  correction,
}: {
  question: ReadingQuestion;
  value: string;
  onChange: (value: string) => void;
  correction?: ReadingSubmitResult['corrections'][number];
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <p className="german font-bold text-white" dir="ltr">
          {question.questionNumber}. {question.questionText}
        </p>
        {correction && (
          <span className={`rounded-full px-3 py-1 text-xs font-black ${correction.isCorrect ? 'bg-emerald-400/10 text-emerald-200' : 'bg-red-400/10 text-red-200'}`}>
            {correction.isCorrect ? 'Correct' : `Correct: ${correction.correctOptionCode}`}
          </span>
        )}
      </div>
      {correction && <p className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-slate-300">{!correction.selectedOptionCode && <span className="font-bold text-amber-200">Sans réponse. </span>}{correction.explanation ?? 'Aucune explication supplémentaire disponible.'}</p>}
      <div className="mt-3 grid gap-2 md:grid-cols-3">
        {question.options.map((option) => (
          <button
            key={option.id}
            type="button"
            disabled={Boolean(correction)}
            onClick={() => onChange(option.code)}
            className={`german rounded-xl border px-3 py-2 text-left text-sm transition ${
              value === option.code
                ? 'border-teal-300/40 bg-teal-300/10 text-white'
                : 'border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/20 hover:text-white'
            }`}
            dir="ltr"
          >
            <span className="font-black">{option.code}</span> · {option.text}
          </button>
        ))}
      </div>
    </div>
  );
}
