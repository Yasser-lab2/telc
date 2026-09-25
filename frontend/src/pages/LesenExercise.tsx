import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Dispatch, SetStateAction } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { apiClient, type ReadingOption, type ReadingQuestion, type ReadingSection, type ReadingSubmitResult } from '../lib/api';

const tabs = [
  { id: 'all', label: 'Examens' },
  { id: 'teil1', label: 'Teil 1' },
  { id: 'teil2', label: 'Teil 2' },
  { id: 'teil3', label: 'Teil 3' },
  { id: 'sprach1', label: 'Sprach Teil 1' },
  { id: 'sprach2', label: 'Sprach Teil 2' },
] as const;
type PracticeScope = (typeof tabs)[number]['id'];
type SectionScope = Exclude<PracticeScope, 'all'>;
const sectionOrder = ['teil1', 'teil2', 'teil3', 'sprach1', 'sprach2'] as const;
const practiceDurations: Record<PracticeScope, number> = { all: 90, teil1: 20, teil2: 20, teil3: 20, sprach1: 15, sprach2: 15 };
const sectionMeta: Record<Exclude<PracticeScope, 'all'>, { label: string; description: string }> = {
  teil1: { label: 'Teil 1', description: 'Texte und Überschriften zuordnen' },
  teil2: { label: 'Teil 2', description: 'Text lesen und Multiple Choice lösen' },
  teil3: { label: 'Teil 3', description: 'Situationen passenden Anzeigen zuordnen' },
  sprach1: { label: 'Sprach Teil 1', description: 'Passende Wörter in den Text einsetzen' },
  sprach2: { label: 'Sprach Teil 2', description: 'Artikel, Präpositionen und Konnektoren' },
};

type SlideKind = 'texts' | 'headlines' | 'text' | 'questions' | 'situations' | 'ads' | 'gaps';
type ReadingSlide = { id: string; label: string; type: SlideKind; description?: string };
type SectionExtra = {
  slides?: ReadingSlide[];
  titleAr?: string | null;
  translation?: string | null;
  titles?: Array<{ code: string; text: string; textAr?: string }>;
  titleTranslationsAr?: Record<string, string>;
  ads?: Array<{ code: string; text: string }>;
  wordBank?: Array<{ code: string; text: string }>;
};

function defaultSlidesFor(sectionCode: ReadingSection['sectionCode']): ReadingSlide[] {
  if (sectionCode === 'teil1') return [
    { id: 'texte', label: 'Texte', type: 'texts', description: 'Lesen Sie die fünf kurzen Mitteilungen.' },
    { id: 'ueberschriften', label: 'Überschriften', type: 'headlines', description: 'Ordnen Sie jeder Mitteilung die passende Überschrift zu.' },
  ];
  if (sectionCode === 'teil3') return [
    { id: 'situationen', label: 'Situationen', type: 'situations', description: 'Lesen Sie die zehn Situationen.' },
    { id: 'anzeigen', label: 'Anzeigen', type: 'ads', description: 'Wählen Sie für jede Situation die passende Anzeige.' },
  ];
  if (sectionCode === 'teil2') return [
    { id: 'text', label: 'Text', type: 'text', description: 'Lesen Sie den Text aufmerksam.' },
    { id: 'fragen', label: 'Fragen', type: 'questions', description: 'Wählen Sie bei jeder Aufgabe A, B oder C.' },
  ];
  return [
    { id: 'text', label: 'Text', type: 'text', description: 'Lesen Sie den Text aufmerksam.' },
    { id: 'luecken', label: 'Lücken', type: 'gaps', description: 'Wählen Sie den passenden Ausdruck für jede Lücke.' },
  ];
}
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
  const [showArabic, setShowArabic] = useState(false);
  const hydratedSession = useRef<string | null>(null);
  const exam = useQuery({ queryKey: ['reading-exam', themeId], queryFn: () => apiClient.readingExam(themeId) });
  const activeSession = useQuery({ queryKey: ['reading-active-session', themeId], queryFn: () => apiClient.activeReadingSession(themeId) });
  const history = useQuery({ queryKey: ['reading-history', themeId], queryFn: () => apiClient.readingHistory(themeId) });
  const isCompleteExam = exam.data?.exam.sections.length === sectionOrder.length;
  const scopeForStart: PracticeScope = isCompleteExam ? 'all' : activeTab;

  useEffect(() => {
    const recovered = activeSession.data?.session;
    if (!recovered || hydratedSession.current === recovered.id) return;
    hydratedSession.current = recovered.id;
    setSessionId(recovered.id);
    setStartedAt(recovered.startedAt);
    setSessionScope(recovered.practiceScope);
    setActiveTab(recovered.practiceScope === 'all' ? 'teil1' : recovered.practiceScope);
    setAnswers(Object.fromEntries(activeSession.data?.answers.map((answer) => [answer.questionId, answer.selectedOptionCode]) ?? []));
    setSaveStatus('saved');
  }, [activeSession.data]);

  useEffect(() => {
    if (!requestedSection && isCompleteExam && activeTab === 'all') setActiveTab('teil1');
  }, [activeTab, isCompleteExam, requestedSection]);

  const start = useMutation({
    mutationFn: (scope: PracticeScope) => apiClient.startReadingExam(themeId, scope),
    onSuccess: (data) => {
      hydratedSession.current = data.session.id;
      setSessionId(data.session.id);
      setStartedAt(data.session.startedAt);
      setSessionScope(data.session.practiceScope);
      setActiveTab(data.session.practiceScope === 'all' ? 'teil1' : data.session.practiceScope);
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
      const started = sessionId ? null : (await apiClient.startReadingExam(themeId, scopeForStart)).session;
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

  const effectiveScope = sessionScope ?? (isCompleteExam ? 'all' : activeTab);
  const assessmentSections = effectiveScope === 'all' ? (exam.data?.exam.sections ?? []) : visibleSections;
  const assessmentQuestionIds = useMemo(() => new Set(assessmentSections.flatMap((section) => section.questions.map((question) => question.id))), [assessmentSections]);
  const totalQuestions = assessmentSections.reduce((total, section) => total + section.questions.length, 0);
  const answeredQuestions = Object.keys(answers).filter((id) => assessmentQuestionIds.has(id)).length;
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

  const selectScope = (scope: PracticeScope) => {
    setActiveTab(isCompleteExam && scope === 'all' ? 'teil1' : scope);
  };
  const activeSectionIndex = sectionOrder.indexOf(activeTab as SectionScope);
  const nextSectionCode = activeSectionIndex >= 0 ? sectionOrder[activeSectionIndex + 1] : undefined;
  const isLastSection = activeSectionIndex === sectionOrder.length - 1;

  return (
    <div className="space-y-6">
      <Link to="/dashboard/lesen" className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm font-bold text-slate-300 transition hover:border-teal-300/30 hover:bg-white/[0.08] hover:text-white" aria-label="Retour aux exercices de lecture">
        <span aria-hidden="true">←</span> Retour aux exercices
      </Link>

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
            {showArabic && exam.data.exam.titleAr && <p className="mt-2 text-right text-sm text-slate-300" dir="rtl">{exam.data.exam.titleAr}</p>}
          </div>
          <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => setShowArabic((value) => !value)} className="min-h-11 rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm font-bold text-slate-300 hover:border-teal-300/30 hover:text-white">
            {showArabic ? 'Afficher l’allemand' : 'الترجمة بالعربية'}
          </button>
          <span className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-bold text-slate-300">{durationMinutes} min · {tabs.find((tab) => tab.id === activeTab)?.label}</span>
          {sessionId && <span className={`rounded-xl border px-4 py-3 text-sm font-black ${secondsRemaining < 300 ? 'border-red-300 bg-red-50 text-red-700' : 'border-border bg-surface text-ink'}`}>{formatCountdown(secondsRemaining)}</span>}
          <button
            type="button"
            onClick={() => start.mutate(scopeForStart)}
            disabled={start.isPending || Boolean(sessionId)}
            className="min-h-11 rounded-2xl border border-teal-300/30 bg-teal-300/10 px-5 text-sm font-black text-teal-100 transition hover:bg-teal-300/20 disabled:opacity-50"
          >
            {sessionId ? 'Session ouverte' : 'Commencer'}
          </button>
          </div>
        </div>
      </section>

      {isCompleteExam && (
        <section className="rounded-[22px] border border-white/10 bg-[#10141d]/80 p-4">
          <div className="grid gap-2 md:grid-cols-5">
            {tabs.slice(1).map((tab, index) => {
              const meta = sectionMeta[tab.id as Exclude<PracticeScope, 'all'>];
              const section = exam.data.exam.sections.find((item) => item.sectionCode === tab.id);
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => selectScope(tab.id)}
                  disabled={Boolean(sessionId) && sessionScope !== 'all' && tab.id !== sessionScope}
                  className={`rounded-2xl border p-3 text-left transition ${
                    isActive ? 'border-teal-300/40 bg-teal-300/10' : 'border-white/10 bg-white/[0.03] hover:border-white/20'
                  } disabled:cursor-not-allowed disabled:opacity-40`}
                >
                  <span className="text-[10px] font-black uppercase tracking-[0.16em] text-teal-200/70">Partie {index + 1} sur 5</span>
                  <span className="mt-2 block text-sm font-black text-white">{meta.label}</span>
                  <span className="mt-1 block text-xs text-slate-500">{section?.questions.length ?? 0} questions</span>
                </button>
              );
            })}
          </div>
        </section>

      )}
      <div className="space-y-5">
        {visibleSections.map((section: ReadingSection) => (
          <SectionView key={section.id} section={section} answers={answers} setAnswers={setAnswers} result={result} showArabic={showArabic} />
        ))}
      </div>

      <section className="rounded-[24px] border border-white/10 bg-[#12151d]/90 p-5 shadow-xl shadow-black/25">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 text-sm"><span className="font-bold text-slate-300">{answeredQuestions}/{totalQuestions} questions répondues</span>{sessionId && <span aria-live="polite" className={`font-bold ${saveStatus === 'error' ? 'text-red-300' : 'text-slate-400'}`}>{saveStatus === 'saving' ? 'Enregistrement…' : saveStatus === 'saved' ? 'Réponses enregistrées' : saveStatus === 'error' ? 'Échec de sauvegarde' : ''}</span>}</div>
        {result ? (
          <ResultSummary result={result} onRetry={async () => {
            setResult(null); setAnswers({}); setSessionId(null); setStartedAt(null); setSessionScope(null); setSaveStatus('idle');
            hydratedSession.current = null; expirySubmitted.current = false;
            await start.mutateAsync(scopeForStart);
          }} />
        ) : (
          <div className="flex flex-col gap-3 sm:flex-row">
            {sessionId && (
              <button
                type="button"
                onClick={async () => {
                  if (!window.confirm('Recommencer cette session ? Les réponses actuelles seront supprimées.')) return;
                  await apiClient.abandonReadingSession(sessionId);
                  setResult(null);
                  setAnswers({});
                  setSessionId(null);
                  setStartedAt(null);
                  setSessionScope(null);
                  setSaveStatus('idle');
                  hydratedSession.current = null;
                  expirySubmitted.current = false;
                  await start.mutateAsync(scopeForStart);
                }}
                className="min-h-11 rounded-2xl border border-red-300/20 bg-red-300/10 px-5 text-sm font-bold text-red-100 hover:bg-red-300/20"
              >
              Recommencer
              </button>
            )}
            {sessionId && sessionScope === 'all' && nextSectionCode && (
              <button
                type="button"
                onClick={() => selectScope(nextSectionCode)}
                className="min-h-11 rounded-2xl border border-teal-300/30 bg-teal-300/10 px-5 text-sm font-black text-teal-100 hover:bg-teal-300/20"
              >
                Continuer vers {sectionMeta[nextSectionCode].label}
              </button>
            )}
            <button
              type="button"
              onClick={async () => {
                const started = sessionId ? null : (await apiClient.startReadingExam(themeId, scopeForStart)).session;
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
              disabled={submit.isPending || !sessionId || (sessionScope === 'all' && !isLastSection)}
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
  showArabic,
}: {
  section: ReadingSection;
  answers: Record<string, string>;
  setAnswers: Dispatch<SetStateAction<Record<string, string>>>;
  result: ReadingSubmitResult | null;
  showArabic: boolean;
}) {
  const extra = (section.extraData ?? {}) as SectionExtra;
  const meta = sectionMeta[section.sectionCode];
  const partNumber = ['teil1', 'teil2', 'teil3', 'sprach1', 'sprach2'].indexOf(section.sectionCode) + 1;
  const slides = extra.slides?.length ? extra.slides : defaultSlidesFor(section.sectionCode);
  const [activeSlideId, setActiveSlideId] = useState(slides[0]?.id ?? 'content');
  useEffect(() => {
    setActiveSlideId(slides[0]?.id ?? 'content');
  }, [section.id]);
  const activeSlide = slides.find((slide) => slide.id === activeSlideId) ?? slides[0] ?? { id: 'content', label: 'Inhalt', type: 'text' as const };
  const activeSlideIndex = Math.max(0, slides.findIndex((slide) => slide.id === activeSlide.id));
  const showQuestions = ['headlines', 'questions', 'ads', 'gaps'].includes(activeSlide.type);
  const supportsRandomization = section.sectionCode === 'teil1' || section.sectionCode === 'teil3';
  const [randomize, setRandomize] = useState(false);
  const displayedQuestions = useMemo(
    () => randomize ? deterministicShuffle(section.questions, section.id) : section.questions,
    [randomize, section.id, section.questions],
  );
  const selectedOptionCodes = useMemo(
    () => new Set(displayedQuestions.map((question) => answers[question.id]).filter(Boolean)),
    [answers, displayedQuestions],
  );
  const readingText = section.mainText;

  return (
    <article className="rounded-[24px] border border-white/10 bg-[#12151d]/90 p-5 shadow-xl shadow-black/25">
      <div className="flex flex-col gap-2 border-b border-white/10 pb-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-teal-200/70">Teil {partNumber} von 5 · {meta.description}</p>
          <h2 className="german text-2xl font-black text-white" dir="ltr">{section.title}</h2>
          {showArabic && extra.titleAr && <p className="mt-2 text-right text-sm text-slate-300" dir="rtl">{extra.titleAr}</p>}
          <p className="mt-2 text-sm text-slate-400">{section.instructions ?? meta.description}</p>
        </div>
          <span className="text-sm font-bold text-slate-500">{section.pointsMax} points</span>
      </div>

      <div className="mt-5 flex gap-2 overflow-x-auto rounded-2xl border border-white/10 bg-black/20 p-2">
        {slides.map((slide, index) => (
          <button
            key={slide.id}
            type="button"
            onClick={() => setActiveSlideId(slide.id)}
            className={`shrink-0 rounded-xl px-4 py-2 text-sm font-black transition ${
              slide.id === activeSlideId ? 'bg-white text-slate-950' : 'text-slate-400 hover:bg-white/10 hover:text-white'
            }`}
          >
            {index + 1}. {slide.label}
          </button>
        ))}
      </div>

      {supportsRandomization && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/20 p-3">
          <p className="text-sm text-slate-400">Les questions restent associées à cet examen.</p>
          <button type="button" onClick={() => setRandomize((value) => !value)} className={`rounded-xl border px-3 py-2 text-xs font-black transition ${randomize ? 'border-teal-300/40 bg-teal-300/10 text-teal-100' : 'border-white/10 text-slate-400 hover:text-white'}`}>
            {randomize ? 'Rétablir l’ordre' : 'Mélanger les questions'}
          </button>
        </div>
      )}
      <div className="mt-4 rounded-2xl border border-teal-300/20 bg-teal-300/[0.06] p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-black text-teal-100">{activeSlide.label}</p>
          <span className="text-xs font-bold text-teal-200/70">Slide {activeSlideIndex + 1} von {slides.length}</span>
        </div>
        {activeSlide.description && <p className="mt-1 text-sm text-slate-400">{activeSlide.description}</p>}
      </div>

      {activeSlide.type === 'texts' && <SlideTextList text={readingText} />}
      {activeSlide.type === 'text' && <ReadingText text={readingText} />}
      {activeSlide.type === 'situations' && <SituationList questions={displayedQuestions} />}
      {activeSlide.type === 'headlines' && extra.titles && section.sectionCode === 'teil1' && (
        <Teil1MatchingView
          text={readingText}
          questions={displayedQuestions}
          titles={extra.titles.map((title) => ({
            ...title,
            textAr: title.textAr ?? extra.titleTranslationsAr?.[title.code] ?? knownTitleTranslationsAr[title.text],
          }))}
          answers={answers}
          setAnswers={setAnswers}
          result={result}
          showArabic={showArabic}
        />
      )}
      {activeSlide.type === 'ads' && <OptionBank title="Anzeigen" items={extra.ads ?? collectAds(section.questions)} />}
      {activeSlide.type === 'gaps' && extra.wordBank && <OptionBank title="Wortbank" items={extra.wordBank} />}

      {showQuestions && !(section.sectionCode === 'teil1' && activeSlide.type === 'headlines') && (
        <div className="mt-5 space-y-4">
          {displayedQuestions.map((question) => (
            <QuestionView
              key={question.id}
              question={question}
              options={randomize ? deterministicShuffle(question.options, `${section.id}:${question.id}`) : question.options}
              value={answers[question.id] ?? ''}
              usedOptionCodes={new Set([...selectedOptionCodes].filter((code) => code !== answers[question.id]))}
              preventDuplicate={section.exerciseType === 'gap_word_bank' || section.exerciseType === 'matching_titles'}
              onChange={(value) => setAnswers((current) => ({ ...current, [question.id]: value }))}
              correction={result?.corrections.find((item) => item.questionId === question.id)}
            />
          ))}
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
        <button type="button" onClick={() => window.alert('Veuillez décrire le problème à l’équipe de support.')} className="text-xs font-bold text-slate-500 hover:text-white">Signaler un problème</button>
        <div className="flex items-center gap-3">
        <button type="button" onClick={() => setActiveSlideId(slides[Math.max(0, activeSlideIndex - 1)].id)} disabled={activeSlideIndex === 0} className="rounded-xl border border-white/10 px-4 py-2 text-sm font-bold text-slate-300 disabled:cursor-not-allowed disabled:opacity-30">
          ← Précédent
        </button>
        <span className="text-xs font-bold text-slate-500">{activeSlideIndex + 1}/{slides.length}</span>
        <button type="button" onClick={() => setActiveSlideId(slides[Math.min(slides.length - 1, activeSlideIndex + 1)].id)} disabled={activeSlideIndex === slides.length - 1} className="rounded-xl bg-white px-4 py-2 text-sm font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-30">
          Suivant →
        </button>
        </div>
      </div>
    </article>
  );
}

function deterministicShuffle<T>(items: T[], seed: string) {
  const copy = [...items];
  let hash = 0;
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  for (let index = copy.length - 1; index > 0; index -= 1) {
    hash = (hash * 1664525 + 1013904223) >>> 0;
    const swapIndex = hash % (index + 1);
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function normalizeReadingText(text: string | null) {
  return (text ?? '').replace(/\\n/g, '\n').trim();
}

const knownTitleTranslationsAr: Record<string, string> = {
  'Lebensmittel teilen statt wegwerfen': 'مشاركة الطعام بدل رميه',
  'Mini-Pausen stärken die Konzentration': 'فترات الراحة القصيرة تقوّي التركيز',
  'Alte Geräte erhalten eine zweite Chance': 'فرصة ثانية للأجهزة القديمة',
  'Neue Klimainseln entstehen an Haltestellen': 'واحات مناخية جديدة في محطات الحافلات',
  'Fahrradfahren ist nur etwas für Sportler': 'ركوب الدراجة للرياضيين فقط',
  'Lastenräder kann man auch ausleihen': 'يمكن أيضاً استعارة دراجات الشحن',
  'Ein Garten für alle Generationen': 'حديقة لجميع الأجيال',
  'Schnelle Lösungen für hohe Stromkosten': 'حلول سريعة لارتفاع تكاليف الكهرباء',
  'Mehr Urlaub durch bessere Planung': 'إجازة أطول بفضل التخطيط الأفضل',
  'Wie Kinder sicher schwimmen lernen': 'كيف يتعلم الأطفال السباحة بأمان',
  'Weniger Papier, bessere Übersicht': 'ورق أقل وتنظيم أفضل',
  'Ein zusätzlicher freier Tag braucht klare Regeln': 'يوم عطلة إضافي يحتاج إلى قواعد واضحة',
  'Gemeinsam arbeiten, obwohl die Abteilungen verschieden sind': 'العمل معاً رغم اختلاف الأقسام',
  'Prüfungen werden vollständig abgeschafft': 'إلغاء الامتحانات بالكامل',
  'Erholung durch eine neue Arbeitswoche': 'راحة أكبر بفضل أسبوع عمل جديد',
  'Die Universität ersetzt alle Lehrkräfte durch Apps': 'الجامعة تستبدل جميع المدرسين بالتطبيقات',
  'Gemeinsam lernen, individuell vorankommen': 'التعلم معاً والتقدم بشكل فردي',
  'Erfahrung wird an Berufsanfänger weitergegeben': 'نقل الخبرة إلى المبتدئين في العمل',
  'Nur Einzelbüros erhöhen die Leistung': 'المكاتب الفردية وحدها تزيد الأداء',
  'Mit Schlagwörtern Informationen wiederfinden': 'العثور على المعلومات باستخدام الكلمات المفتاحية',
};

function Teil1MatchingView({
  text,
  questions,
  titles,
  answers,
  setAnswers,
  result,
  showArabic,
}: {
  text: string | null;
  questions: ReadingQuestion[];
  titles: Array<{ code: string; text: string; textAr?: string }>;
  answers: Record<string, string>;
  setAnswers: Dispatch<SetStateAction<Record<string, string>>>;
  result: ReadingSubmitResult | null;
  showArabic: boolean;
}) {
  const entries = normalizeReadingText(text).split(/\n\s*\n/).filter(Boolean);
  const usedCodes = new Set(questions.map((question) => answers[question.id]).filter(Boolean));

  return (
    <div className="mt-5 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="space-y-4">
        {questions.map((question) => {
          const value = answers[question.id] ?? '';
          const correction = result?.corrections.find((item) => item.questionId === question.id);
          const entry = entries[question.questionNumber - 1] ?? '';
          return (
            <section key={question.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-teal-200/70">Text {question.questionNumber}</p>
                {correction && (
                  <span className={`rounded-full px-3 py-1 text-xs font-black ${correction.isCorrect ? 'bg-emerald-400/10 text-emerald-200' : 'bg-red-400/10 text-red-200'}`}>
                    {correction.isCorrect ? 'Correct' : `Bonne réponse : ${correction.correctOptionCode}`}
                  </span>
                )}
              </div>
              <p className="german mt-3 leading-7 text-slate-200" dir="ltr">{entry.replace(/^\d+\.\s*/, '')}</p>
              <div className="mt-4 flex flex-wrap gap-2" aria-label={`Überschrift für Text ${question.questionNumber}`}>
                {titles.map((title) => {
                  const unavailable = usedCodes.has(title.code) && value !== title.code;
                  return (
                    <button
                      key={title.code}
                      type="button"
                      aria-label={`${title.code}: ${title.text}`}
                      title={title.text}
                      disabled={Boolean(correction) || unavailable}
                      onClick={() => setAnswers((current) => ({ ...current, [question.id]: title.code }))}
                      className={`grid h-10 w-10 place-items-center rounded-xl border text-sm font-black transition ${
                        value === title.code
                          ? 'border-cyan-300/60 bg-cyan-300/15 text-cyan-50 shadow-lg shadow-cyan-950/30'
                          : 'border-white/10 bg-white/[0.04] text-slate-300 hover:border-cyan-300/30 hover:text-white'
                      } disabled:cursor-not-allowed disabled:opacity-25`}
                    >
                      {title.code}
                    </button>
                  );
                })}
              </div>
              {correction && <p className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-slate-300">{correction.explanation ?? 'Aucune explication supplémentaire.'}</p>}
            </section>
          );
        })}
      </div>

      <aside className="rounded-2xl border border-cyan-300/20 bg-[#0b1720]/95 p-4 shadow-xl shadow-black/20 lg:sticky lg:top-24">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="font-black text-white">Titres A–J</h3>
          <span className="text-xs font-bold text-cyan-200/70">{usedCodes.size}/5 sélectionnés</span>
        </div>
        <div className="space-y-2">
          {titles.map((title) => (
            <div key={title.code} className={`rounded-xl border p-3 ${usedCodes.has(title.code) ? 'border-cyan-300/30 bg-cyan-300/[0.08]' : 'border-white/10 bg-white/[0.03]'}`}>
              <div className="flex gap-3">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-white/10 text-xs font-black text-white">{title.code}</span>
                <p className="german text-sm font-bold leading-6 text-slate-100" dir="ltr">{title.text}</p>
              </div>
              {showArabic && title.textAr && <p className="mt-2 border-t border-white/10 pt-2 text-right text-xs leading-6 text-slate-300" dir="rtl">{title.textAr}</p>}
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs leading-5 text-slate-500">Chaque titre ne peut être utilisé qu’une fois. Cinq titres ne seront pas utilisés.</p>
      </aside>
    </div>
  );
}

function SlideTextList({ text }: { text: string | null }) {
  const entries = normalizeReadingText(text).split(/\n\s*\n/).filter(Boolean);
  return (
    <div className="mt-5 grid gap-3">
      {entries.map((entry, index) => (
        <div key={index} className="german rounded-2xl border border-white/10 bg-black/20 p-4 leading-7 text-slate-200" dir="ltr">
          <p className="mb-2 text-xs font-black uppercase tracking-[0.16em] text-teal-200/70">Text {index + 1}</p>
          <p>{entry.replace(/^\d+\.\s*/, '')}</p>
        </div>
      ))}
    </div>
  );
}

function ReadingText({ text }: { text: string | null }) {
  return (
    <div className="german mt-5 whitespace-pre-wrap rounded-2xl border border-white/10 bg-black/20 p-5 leading-7 text-slate-200" dir="ltr">
      {normalizeReadingText(text)}
    </div>
  );
}

function SituationList({ questions }: { questions: ReadingQuestion[] }) {
  return (
    <div className="mt-5 grid gap-3">
      {questions.map((question, index) => (
        <div key={question.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-teal-200/70">Situation {index + 1}</p>
          <p className="german mt-2 font-bold text-white" dir="ltr">{question.questionText}</p>
        </div>
      ))}
    </div>
  );
}

function collectAds(questions: ReadingQuestion[]) {
  const seen = new Set<string>();
  const ads: Array<{ code: string; text: string }> = [];
  for (const question of questions) {
    for (const option of question.options) {
      if (seen.has(option.text)) continue;
      seen.add(option.text);
      ads.push({ code: String.fromCharCode(65 + ads.length), text: option.text });
    }
  }
  return ads;
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
  options,
  value,
  usedOptionCodes,
  preventDuplicate,
  onChange,
  correction,
}: {
  question: ReadingQuestion;
  options?: ReadingOption[];
  value: string;
  usedOptionCodes?: Set<string>;
  preventDuplicate?: boolean;
  onChange: (value: string) => void;
  correction?: ReadingSubmitResult['corrections'][number];
}) {
  const visibleOptions = options ?? question.options;
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
        {visibleOptions.map((option) => (
          <button
            key={option.id}
            type="button"
            disabled={Boolean(correction) || Boolean(preventDuplicate && usedOptionCodes?.has(option.code) && value !== option.code)}
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
