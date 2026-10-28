import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Dispatch, SetStateAction } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { apiClient, type ReadingOption, type ReadingQuestion, type ReadingSection, type ReadingSubmitResult } from '../lib/api';
import { useI18n } from '../lib/i18n';

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
  textTitle?: string | null;
  translation?: string | null;
  titles?: Array<{ code: string; text: string; textAr?: string }>;
  titleTranslationsAr?: Record<string, string>;
  ads?: Array<{ code: string; text: string }>;
  situations?: Array<{ number: number; text: string; textAr?: string }>;
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

function isDirectGapExercise(exerciseType: ReadingSection['exerciseType']) {
  return exerciseType === 'gap_three_options' || exerciseType === 'gap_word_bank';
}

function displayReadingTitle(title: string) {
  return title.replace(/^Prüfung\s+\d+\s*[–-]\s*/i, '').trim();
}

export function LesenExercise() {
  const { themeId = '' } = useParams();
  const { direction, locale, t } = useI18n();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const requestedSection = searchParams.get('section');
  const requestedPracticeScope = requestedSection && requestedSection !== 'all' && sectionOrder.includes(requestedSection as SectionScope)
    ? requestedSection as SectionScope
    : null;
  const isSectionPractice = Boolean(requestedPracticeScope);
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
  const scopeForStart: PracticeScope = requestedPracticeScope ?? (isCompleteExam ? 'all' : activeTab);

  useEffect(() => {
    const recovered = activeSession.data?.session;
    if (!recovered || hydratedSession.current === recovered.id) return;
    hydratedSession.current = recovered.id;
    setSessionId(recovered.id);
    setStartedAt(recovered.startedAt);
    setSessionScope(recovered.practiceScope);
    setActiveTab(requestedPracticeScope ?? (recovered.practiceScope === 'all' ? 'teil1' : recovered.practiceScope));
    setAnswers(Object.fromEntries(activeSession.data?.answers.map((answer) => [answer.questionId, answer.selectedOptionCode]) ?? []));
    setSaveStatus('saved');
  }, [activeSession.data, requestedPracticeScope]);

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
    const selectedScope = requestedPracticeScope ?? activeTab;
    return selectedScope === 'all' ? sections : sections.filter((section: ReadingSection) => section.sectionCode === selectedScope);
  }, [activeTab, exam.data?.exam.sections, requestedPracticeScope]);

  const effectiveScope = sessionScope ?? scopeForStart;
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

  if (exam.isLoading) return <p className="text-slate-400">{t('loading')}</p>;
  if (!exam.data) return <p className="text-red-300">{t('modelNotFound')}</p>;

  const selectScope = (scope: PracticeScope) => {
    setActiveTab(isCompleteExam && scope === 'all' ? 'teil1' : scope);
  };
  const activeSectionIndex = sectionOrder.indexOf(activeTab as SectionScope);
  const nextSectionCode = activeSectionIndex >= 0 ? sectionOrder[activeSectionIndex + 1] : undefined;
  const isLastSection = activeSectionIndex === sectionOrder.length - 1;

  return (
    <div className="space-y-6" dir={direction}>
      <Link to="/dashboard/lesen" className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm font-bold text-slate-300 transition hover:border-indigo-300/30 hover:bg-white/[0.08] hover:text-white" aria-label={t('backToReading')}>
        <span aria-hidden="true">→</span> {t('backToReading')}
      </Link>

      <section className="rounded-[28px] border border-white/10 bg-gradient-to-br from-white/[0.08] to-white/[0.03] p-6 text-left shadow-2xl shadow-black/30 md:p-8" dir="ltr">
        <p className="text-left text-sm font-bold uppercase tracking-[0.2em] text-indigo-200/70" dir="ltr">Leseverstehen · SESSION</p>
        <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="german text-4xl font-black text-white md:text-6xl" dir="ltr">
              {displayReadingTitle(exam.data.exam.title)}
            </h1>
            <p className="mt-3 text-right text-slate-400" dir={direction}>
              {locale === 'ar' ? <><bdi dir="rtl">{exam.data.exam.scoreMax} {t('points')}</bdi> · <bdi dir="rtl">{t('minutes', { count: exam.data.exam.durationMinutes })}</bdi> · <bdi dir="ltr">{exam.data.exam.level}</bdi></> : <><bdi dir="ltr">{exam.data.exam.level}</bdi> · <bdi dir="ltr">{t('minutes', { count: exam.data.exam.durationMinutes })}</bdi> · <bdi dir="ltr">{exam.data.exam.scoreMax} {t('points')}</bdi></>}
            </p>
            {showArabic && exam.data.exam.titleAr && <p className="mt-2 text-right text-sm text-slate-300" dir="rtl">{exam.data.exam.titleAr}</p>}
          </div>
          <div className="flex flex-wrap items-center gap-3">
           <button type="button" dir={direction} onClick={() => setShowArabic((value) => !value)} className="min-h-11 rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm font-bold text-slate-300 hover:border-indigo-300/30 hover:text-white">
             {showArabic ? t('showGerman') : t('showArabic')}
          </button>
              <span className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-bold text-slate-300" dir={direction}>
                {locale === 'ar' ? <><bdi dir="rtl">{t('minutes', { count: durationMinutes })}</bdi> · <bdi dir="ltr">{activeTab === 'all' ? t('exams') : tabs.find((tab) => tab.id === activeTab)?.label}</bdi></> : <><bdi dir="ltr">{t('minutes', { count: durationMinutes })}</bdi> · <bdi dir="ltr">{activeTab === 'all' ? t('exams') : tabs.find((tab) => tab.id === activeTab)?.label}</bdi></>}
             </span>
          {sessionId && <span className={`rounded-xl border px-4 py-3 text-sm font-black ${secondsRemaining < 300 ? 'border-red-300 bg-red-50 text-red-700' : 'border-border bg-surface text-ink'}`}>{formatCountdown(secondsRemaining)}</span>}
          <button
            type="button"
            onClick={() => start.mutate(scopeForStart)}
            disabled={start.isPending || Boolean(sessionId)}
            className="min-h-11 rounded-2xl border border-teal-300/30 bg-teal-300/10 px-5 text-sm font-black text-teal-100 transition hover:bg-teal-300/20 disabled:opacity-50"
            dir={direction}
          >
             {sessionId ? t('solvedSession') : t('begin')}
          </button>
          </div>
        </div>
      </section>

       {isCompleteExam && !isSectionPractice && (
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
                    <span className="text-[10px] font-black uppercase tracking-[0.16em] text-teal-200/70" dir={direction}>{t('partOfFive', { part: index + 1 })}</span>
                   <span className="german mt-2 block text-sm font-black text-white" dir="ltr">{meta.label}</span>
                    <span className="mt-1 block text-xs text-slate-500" dir={direction}>{t('questions', { count: section?.questions.length ?? 0 })}</span>
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
         <div className="mb-4 flex flex-wrap items-center justify-between gap-3 text-sm"><span className="font-bold text-slate-300" dir={direction}>{t('answersCount', { answered: answeredQuestions, total: totalQuestions })}</span>{sessionId && <span dir={direction} aria-live="polite" className={`font-bold ${saveStatus === 'error' ? 'text-red-300' : 'text-slate-400'}`}>{saveStatus === 'saving' ? t('saving') : saveStatus === 'saved' ? t('answersSaved') : saveStatus === 'error' ? t('saveFailed') : ''}</span>}</div>
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
                    if (!window.confirm(t('restartSessionConfirm'))) return;
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
                {t('restartSession')}
              </button>
            )}
            {sessionId && !isSectionPractice && sessionScope === 'all' && nextSectionCode && (
              <button
                type="button"
                onClick={() => selectScope(nextSectionCode)}
                className="min-h-11 rounded-2xl border border-teal-300/30 bg-teal-300/10 px-5 text-sm font-black text-teal-100 hover:bg-teal-300/20"
              >
                 <bdi dir="ltr">{t('continueTo', { section: sectionMeta[nextSectionCode].label })}</bdi>
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
                {t('saveNow')}
            </button>
            <button
              type="button"
              onClick={() => {
                const missing = totalQuestions - answeredQuestions;
                  if (missing > 0 && !window.confirm(t('unansweredConfirm', { count: missing }))) return;
                  if (window.confirm(t('submitConfirm'))) submit.mutate();
              }}
              disabled={submit.isPending || !sessionId || (sessionScope === 'all' && !isLastSection)}
              className="min-h-11 rounded-2xl border border-teal-300/30 bg-teal-300/10 px-5 text-sm font-black text-teal-100 hover:bg-teal-300/20 disabled:opacity-50"
            >
                {submit.isPending ? t('submitting') : t('submitReview')}
            </button>
          </div>
        )}
      </section>
      <HistoryTrend history={history.data?.history ?? []} />
    </div>
  );
}

function ResultSummary({ result, onRetry }: { result: ReadingSubmitResult; onRetry: () => Promise<void> }) {
  const { direction, t } = useI18n();
  const unanswered = result.corrections.filter((item) => !item.selectedOptionCode).length;
  return <div>
     <div className="grid gap-4 md:grid-cols-[auto_1fr] md:items-center"><div className="grid h-28 w-28 place-items-center rounded-full border-8 border-teal-300/30 bg-teal-300/10 text-center"><div><p className="text-3xl font-black text-white" dir="ltr">{result.percentage}%</p><p className="text-[10px] font-bold uppercase text-slate-400" dir={direction}>{t('resultScore')}</p></div></div><div><h2 className="text-2xl font-black text-white" dir={direction}><bdi dir={direction}>{t('resultScore')}</bdi>: <bdi dir="ltr">{result.score}/{result.scoreMax}</bdi></h2><p className="mt-2 text-sm text-slate-400" dir={direction}>{unanswered ? t('unansweredQuestions', { count: unanswered }) : t('allAnswered')}</p></div></div>
    <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{result.sectionSummary.map((section) => <div key={section.sectionCode} className="rounded-xl border border-white/10 bg-black/20 p-3"><p className="text-xs font-bold uppercase text-slate-500">{section.sectionCode}</p><p className="mt-2 text-lg font-black text-white">{section.score}/{section.scoreMax}</p></div>)}</div>
    <div className="mt-6 flex flex-wrap gap-3"><button type="button" onClick={() => void onRetry()} className="min-h-11 rounded-xl bg-white px-5 text-sm font-black text-slate-950">{t('retry')}</button><Link to="/dashboard/lesen" className="inline-flex min-h-11 items-center rounded-xl border border-white/10 px-5 text-sm font-bold text-slate-200">{t('returnExams')}</Link></div>
  </div>;
}

function HistoryTrend({ history }: { history: Array<{ id: string; finishedAt: string; percentage: number }> }) {
  const { direction, locale, t } = useI18n();
  if (!history.length) return null;
  const chronological = history.slice(0, 5).reverse();
    return <section className="rounded-[24px] border border-white/10 bg-[#12151d]/90 p-5 shadow-xl shadow-black/25"><div className="flex items-end justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-200/70">{t('scoreHistory')}</p><h2 className="mt-2 text-xl font-black text-white">{t('scoreEvolution')}</h2></div><span className="text-xs text-slate-500" dir={direction}>{t('attempts', { count: history.length })}</span></div><div className="mt-6 flex h-40 items-end gap-3">{chronological.map((attempt) => <div key={attempt.id} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-2"><span className="text-xs font-black text-slate-300" dir="ltr">{Math.round(attempt.percentage)}%</span><div className="w-full max-w-16 rounded-t-lg bg-gradient-to-t from-accent to-teal-300" style={{ height: `${Math.max(6, attempt.percentage)}%` }} /><span className="text-[10px] text-slate-500" dir={locale === 'ar' ? 'rtl' : direction}>{new Intl.DateTimeFormat(locale === 'ar' ? 'ar-MA' : locale === 'en' ? 'en-MA' : 'fr-FR', { day: '2-digit', month: '2-digit' }).format(new Date(attempt.finishedAt))}</span></div>)}</div></section>;
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
  const { direction, t } = useI18n();
  const extra = (section.extraData ?? {}) as SectionExtra;
  const meta = sectionMeta[section.sectionCode];
  const partNumber = ['teil1', 'teil2', 'teil3', 'sprach1', 'sprach2'].indexOf(section.sectionCode) + 1;
  const directGapExercise = isDirectGapExercise(section.exerciseType);
  const slides = directGapExercise
    ? [extra.slides?.find((slide) => slide.type === 'gaps') ?? { id: 'luecken', label: 'Lücken', type: 'gaps' as const, description: 'Wählen Sie die passende Antwort für jede Lücke.' }]
    : (extra.slides?.length ? extra.slides : defaultSlidesFor(section.sectionCode));
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
    <article className="rounded-[24px] border border-white/10 bg-[#12151d]/90 p-5 text-left shadow-xl shadow-black/25" dir="ltr">
      <div className="flex flex-col gap-2 border-b border-white/10 pb-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-teal-200/70" dir="ltr">Teil {partNumber} von 5 · {meta.description}</p>
          <h2 className="german text-2xl font-black text-white" dir="ltr">{section.title}</h2>
          {showArabic && extra.titleAr && <p className="mt-2 text-right text-sm text-slate-300" dir="rtl">{extra.titleAr}</p>}
          <p className="mt-2 text-sm text-slate-400" dir="ltr">{section.instructions ?? meta.description}</p>
        </div>
          <span className="shrink-0 self-end text-right text-sm font-bold text-slate-500 md:self-auto" dir={direction}><bdi dir={direction}>{section.pointsMax} {t('points')}</bdi></span>
      </div>

      {!directGapExercise && (
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
      )}

      {supportsRandomization && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/20 p-3">
           <p className="text-sm text-slate-400" dir={direction}>{t('questionsStay')}</p>
          <button type="button" dir={direction} onClick={() => setRandomize((value) => !value)} className={`rounded-xl border px-3 py-2 text-xs font-black transition ${randomize ? 'border-teal-300/40 bg-teal-300/10 text-teal-100' : 'border-white/10 text-slate-400 hover:text-white'}`}>
             {randomize ? t('restoreOrder') : t('shuffleQuestions')}
          </button>
        </div>
      )}
      {!directGapExercise && (
        <div className="mt-4 rounded-2xl border border-teal-300/20 bg-teal-300/[0.06] p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-black text-teal-100" dir="ltr">{activeSlide.label}</p>
              <span className="text-xs font-bold text-teal-200/70" dir={direction}>{t('slide')} {activeSlideIndex + 1} {t('of')} {slides.length}</span>
          </div>
           {activeSlide.description && <p className="mt-1 text-sm text-slate-400" dir="ltr">{activeSlide.description}</p>}
        </div>
      )}

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
      {activeSlide.type === 'ads' && section.exerciseType === 'matching_ads' && (
        <Teil3MatchingView
          questions={displayedQuestions}
          ads={uniqueChoiceItems(extra.ads ?? collectAds(section.questions))}
          situations={extra.situations}
          answers={answers}
          setAnswers={setAnswers}
          result={result}
          showArabic={showArabic}
        />
      )}
      {activeSlide.type === 'ads' && section.exerciseType !== 'matching_ads' && <OptionBank title="Anzeigen" items={extra.ads ?? collectAds(section.questions)} />}
      {activeSlide.type === 'gaps' && section.exerciseType === 'gap_three_options' && (
        <GapThreeOptionsView
          text={readingText}
          textTitle={extra.textTitle}
          questions={displayedQuestions}
          answers={answers}
          setAnswers={setAnswers}
          result={result}
        />
      )}
      {activeSlide.type === 'gaps' && section.exerciseType === 'gap_word_bank' && (
        <GapWordBankView
          text={readingText}
          questions={displayedQuestions}
          wordBank={extra.wordBank ?? collectWordBank(section.questions)}
          answers={answers}
          setAnswers={setAnswers}
          result={result}
        />
      )}
      {activeSlide.type === 'gaps' && section.exerciseType !== 'gap_word_bank' && extra.wordBank && <OptionBank title="Wortbank" items={extra.wordBank} />}

      {showQuestions && section.exerciseType !== 'matching_ads' && section.exerciseType !== 'gap_three_options' && section.exerciseType !== 'gap_word_bank' && !(section.sectionCode === 'teil1' && activeSlide.type === 'headlines') && (
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

      {!directGapExercise && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
           <button type="button" dir={direction} onClick={() => window.alert(t('reportProblem'))} className="text-xs font-bold text-slate-500 hover:text-white">{t('reportProblem')}</button>
          <div className="flex items-center gap-3">
          <button type="button" dir={direction} onClick={() => setActiveSlideId(slides[Math.max(0, activeSlideIndex - 1)].id)} disabled={activeSlideIndex === 0} className="rounded-xl border border-white/10 px-4 py-2 text-sm font-bold text-slate-300 disabled:cursor-not-allowed disabled:opacity-30">
             ← {t('previousSlide')}
          </button>
          <span className="text-xs font-bold text-slate-500">{activeSlideIndex + 1}/{slides.length}</span>
          <button type="button" dir={direction} onClick={() => setActiveSlideId(slides[Math.min(slides.length - 1, activeSlideIndex + 1)].id)} disabled={activeSlideIndex === slides.length - 1} className="rounded-xl bg-white px-4 py-2 text-sm font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-30">
             {t('nextSlide')} →
          </button>
          </div>
        </div>
      )}
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
  const { direction, t } = useI18n();
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
                  <span dir="ltr" className={`rounded-full px-3 py-1 text-xs font-black ${correction.isCorrect ? 'bg-emerald-400/10 text-emerald-200' : 'bg-red-400/10 text-red-200'}`}>
                    {correction.isCorrect ? t('correct') : `${t('correctAnswerLabel')}: ${correction.correctOptionCode}`}
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
              {correction && <p className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-slate-300" dir={direction}>{correction.explanation ?? t('additionalExplanation')}</p>}
            </section>
          );
        })}
      </div>

      <aside className="rounded-2xl border border-cyan-300/20 bg-[#0b1720]/95 p-4 shadow-xl shadow-black/20 lg:sticky lg:top-24">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="font-black text-white">Titres A–J</h3>
          <span className="text-xs font-bold text-cyan-200/70" dir={direction}>{t('titlesUsed', { count: usedCodes.size })}</span>
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
         <p className="mt-3 text-xs leading-5 text-slate-500" dir={direction}>{t('titleUsage')}</p>
      </aside>
    </div>
  );
}

function Teil3MatchingView({
  questions,
  ads,
  situations,
  answers,
  setAnswers,
  result,
  showArabic,
}: {
  questions: ReadingQuestion[];
  ads: Array<{ code: string; text: string }>;
  situations?: Array<{ number: number; text: string; textAr?: string }>;
  answers: Record<string, string>;
  setAnswers: Dispatch<SetStateAction<Record<string, string>>>;
  result: ReadingSubmitResult | null;
  showArabic: boolean;
}) {
  const { direction, t } = useI18n();
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  const [selectedAdCode, setSelectedAdCode] = useState<string | null>(null);
  const assignedByAd = useMemo(() => new Map(
    questions
      .map((question) => [answers[question.id], question.questionNumber] as const)
      .filter(([code]) => Boolean(code)),
  ), [answers, questions]);
  const answeredCount = questions.filter((question) => Boolean(answers[question.id])).length;

  const assign = (questionId: string, adCode: string) => {
    setAnswers((current) => {
      const next = { ...current };
      for (const question of questions) {
        if (question.id !== questionId && next[question.id] === adCode) delete next[question.id];
      }
      next[questionId] = adCode;
      return next;
    });
    setSelectedQuestionId(null);
    setSelectedAdCode(null);
  };

  const chooseQuestion = (questionId: string) => {
    if (result) return;
    if (selectedAdCode) {
      assign(questionId, selectedAdCode);
      return;
    }
    setSelectedQuestionId((current) => current === questionId ? null : questionId);
  };

  const chooseAd = (adCode: string) => {
    if (result) return;
    if (selectedQuestionId) {
      assign(selectedQuestionId, adCode);
      return;
    }
    setSelectedAdCode((current) => current === adCode ? null : adCode);
  };

  const clearAssignment = (questionId: string) => {
    if (result) return;
    setAnswers((current) => {
      const { [questionId]: _removed, ...rest } = current;
      return rest;
    });
    setSelectedQuestionId(null);
    setSelectedAdCode(null);
  };

  return (
    <div className="mt-5" dir="ltr">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-cyan-300/20 bg-cyan-300/[0.06] p-4">
        <div dir={direction}>
          <p className="text-sm font-black text-cyan-50">{t('matchInstructionTitle')}</p>
          <p className="mt-1 text-xs leading-5 text-slate-400">{t('matchInstruction')}</p>
        </div>
        <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-black text-cyan-100" dir={direction}>{t('assignedCount', { count: answeredCount, total: questions.length })}</span>
      </div>

      <div className="grid items-start gap-5 md:grid-cols-[minmax(0,1fr)_minmax(320px,390px)]">
        <section className="order-1 md:order-2" aria-label={t('situationsLabel')}>
           <div className="mb-3 flex items-center justify-between gap-3" dir={direction}>
            <div>
              <h3 className="text-lg font-black text-white">{t('situationsLabel')}</h3>
              <p className="mt-1 text-xs text-slate-500">{t('chooseSituation')}</p>
            </div>
             <span className="text-xs font-bold text-slate-500" dir={direction}>{t('tasks', { count: questions.length })}</span>
          </div>
          <div className="space-y-3">
            {questions.map((question) => {
              const value = answers[question.id] ?? '';
              const ad = ads.find((item) => item.code === value);
              const correction = result?.corrections.find((item) => item.questionId === question.id);
              const translation = situations?.find((situation) => situation.text === question.questionText)?.textAr;
              const selected = selectedQuestionId === question.id;
              return (
                <div key={question.id} className={`rounded-2xl border p-3 transition ${selected ? 'border-cyan-300/70 bg-cyan-300/[0.08] shadow-lg shadow-cyan-950/20' : 'border-white/10 bg-[#12151d]/90'}`}>
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      disabled={Boolean(result)}
                      onClick={() => chooseQuestion(question.id)}
                      aria-pressed={selected}
                      className="flex min-w-0 flex-1 items-start gap-3 text-left"
                    >
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-indigo-400/15 text-sm font-black text-indigo-100">{question.questionNumber}</span>
                      <span className="min-w-0">
                        <span className="german block text-sm font-bold leading-6 text-slate-100" dir="ltr">{question.questionText}</span>
                        {showArabic && translation && <span className="mt-2 block text-right text-xs leading-5 text-slate-400" dir="rtl">{translation}</span>}
                      </span>
                    </button>
                    {ad && !result && (
                      <button type="button" onClick={() => clearAssignment(question.id)} className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-slate-500 transition hover:bg-red-400/10 hover:text-red-200" aria-label={t('removeAssignment', { number: question.questionNumber })}>×</button>
                    )}
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                    {ad ? <p className="german min-w-0 truncate text-xs font-black text-cyan-100" dir="ltr"><span className="text-cyan-300">{ad.code}</span> · {ad.text.replace(/\s+/g, ' ')}</p> : <p className="text-xs font-bold text-slate-500" dir={direction}>{t('noAdSelected')}</p>}
                  {correction && <span dir="ltr" className={`shrink-0 text-[11px] font-black ${correction.isCorrect ? 'text-emerald-300' : 'text-red-300'}`}>{correction.isCorrect ? '✓' : `→ ${correction.correctOptionCode}`}</span>}
                  </div>
                  {correction && <p className="mt-2 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs leading-5 text-slate-400" dir={direction}>{correction.explanation ?? t('additionalExplanation')}</p>}
                </div>
              );
            })}
          </div>
        </section>

        <aside className="order-2 self-start rounded-2xl border border-cyan-300/20 bg-[#0b1720]/95 p-4 shadow-xl shadow-black/20 md:order-1 md:sticky md:top-24" aria-label={t('adsLabel')}>
          <div className="mb-3 flex items-center justify-between gap-3" dir={direction}>
            <div>
              <h3 className="text-lg font-black text-white">{t('adsLabel')}</h3>
              <p className="mt-1 text-xs text-slate-500">{t('chooseAd')}</p>
            </div>
             <span className="text-xs font-bold text-cyan-200/70" dir={direction}>{t('textsCount', { count: ads.length })}</span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-1">
            {ads.map((ad) => {
              const assignedTo = assignedByAd.get(ad.code);
              const selected = selectedAdCode === ad.code;
              return (
                <button
                  key={ad.code}
                  type="button"
                  disabled={Boolean(result)}
                  onClick={() => chooseAd(ad.code)}
                  aria-pressed={selected}
                  className={`german rounded-xl border p-3 text-left transition ${selected ? 'border-cyan-300/70 bg-cyan-300/[0.14] text-white shadow-lg shadow-cyan-950/20' : assignedTo ? 'border-teal-300/30 bg-teal-300/[0.06] text-slate-200' : 'border-white/10 bg-white/[0.03] text-slate-300 hover:border-cyan-300/40 hover:bg-white/[0.07]'} disabled:cursor-not-allowed disabled:opacity-80`}
                  dir="ltr"
                >
                  <span className="flex items-start gap-2">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-white/10 text-xs font-black text-white">{ad.code}</span>
                    <span className="min-w-0 flex-1 text-xs leading-5">{ad.text}</span>
                  </span>
                  {assignedTo && <span className="mt-2 block text-[10px] font-black uppercase tracking-[0.12em] text-teal-200/70">Situation {assignedTo}</span>}
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-xs leading-5 text-slate-500" dir={direction}>{t('eachAdOnce')}</p>
        </aside>
      </div>
    </div>
  );
}

function GapThreeOptionsView({
  text,
  textTitle,
  questions,
  answers,
  setAnswers,
  result,
}: {
  text: string | null;
  textTitle?: string | null;
  questions: ReadingQuestion[];
  answers: Record<string, string>;
  setAnswers: Dispatch<SetStateAction<Record<string, string>>>;
  result: ReadingSubmitResult | null;
}) {
  const { direction, t } = useI18n();
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  const questionByNumber = useMemo(() => new Map(questions.map((question) => [question.questionNumber, question])), [questions]);
  const answeredCount = questions.filter((question) => Boolean(answers[question.id])).length;
  const paragraphs = normalizeReadingText(text).split(/\n\s*\n/).filter(Boolean);
  const tokenPattern = /(\{\{\d+\}\}|\(\d+\))/g;

  const chooseOption = (questionId: string, optionCode: string) => {
    if (result) return;
    setAnswers((current) => ({ ...current, [questionId]: optionCode }));
    setSelectedQuestionId(null);
  };

  const chooseGap = (questionId: string) => {
    if (result) return;
    setSelectedQuestionId((current) => current === questionId ? null : questionId);
  };

  return (
    <div className="mt-5" dir="ltr">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-indigo-300/20 bg-indigo-300/[0.06] p-4">
        <div dir={direction}>
          <p className="text-sm font-black text-indigo-50">{t('completeWithChoices')}</p>
          <p className="mt-1 text-xs leading-5 text-slate-400">{t('gapInstruction')}</p>
        </div>
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-black text-indigo-100" dir={direction}>{t('filledCount', { count: answeredCount, total: questions.length })}</span>
      </div>

      <div className="grid items-start gap-5 md:grid-cols-[minmax(0,1fr)_minmax(320px,380px)]">
        <article className="order-1 rounded-2xl border border-white/10 bg-[#12151d]/90 p-5 shadow-xl shadow-black/20" aria-label="Text mit Lücken">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 text-left" dir="ltr">
            <div>
              <h3 className="german text-lg font-black text-white" dir="ltr">{textTitle ?? 'Text'}</h3>
              <p className="mt-1 text-xs text-slate-500" dir={direction}>{t('textLeft')}</p>
            </div>
            <span className="text-xs font-bold text-slate-500" dir="ltr">Sprachbausteine Teil 1</span>
          </div>
          <div className="german space-y-5 text-[15px] leading-8 text-slate-200" dir="ltr">
            {paragraphs.map((paragraph, paragraphIndex) => (
              <p key={paragraphIndex}>
                {paragraph.split(tokenPattern).map((part, partIndex) => {
                  const numberMatch = part.match(/^\{\{(\d+)\}\}$|^\((\d+)\)$/);
                  if (!numberMatch) return <span key={`${paragraphIndex}-${partIndex}`} className="whitespace-pre-wrap">{part}</span>;
                  const questionNumber = Number(numberMatch[1] ?? numberMatch[2]);
                  const question = questionByNumber.get(questionNumber);
                  if (!question) return <span key={`${paragraphIndex}-${partIndex}`}>{part}</span>;
                  const value = answers[question.id] ?? '';
                  const option = question.options.find((item) => item.code === value);
                  const correction = result?.corrections.find((item) => item.questionId === question.id);
                  const selected = selectedQuestionId === question.id;
                  return (
                    <button
                      key={`${paragraphIndex}-${partIndex}`}
                      type="button"
                      disabled={Boolean(result)}
                      onClick={() => chooseGap(question.id)}
                      aria-label={`Lücke ${questionNumber}`}
                      aria-pressed={selected}
                      className={`mx-1 inline-flex min-w-24 items-center justify-center rounded-lg border px-3 py-1 align-baseline text-sm font-black transition ${selected ? 'border-indigo-300 bg-indigo-300/15 text-indigo-50 shadow-lg shadow-indigo-950/20' : correction?.isCorrect ? 'border-emerald-300/50 bg-emerald-300/10 text-emerald-100' : correction ? 'border-red-300/50 bg-red-300/10 text-red-100' : option ? 'border-cyan-300/50 bg-cyan-300/10 text-cyan-50' : 'border-slate-400/50 bg-slate-900 text-cyan-200 hover:border-indigo-300/60'}`}
                    >
                      {option ? option.text : `(${questionNumber})`}
                    </button>
                  );
                })}
              </p>
            ))}
          </div>
          {result && (
            <div className="mt-5 space-y-2 border-t border-white/10 pt-4">
              {questions.map((question) => {
                const correction = result.corrections.find((item) => item.questionId === question.id);
                if (!correction || correction.isCorrect) return null;
                return <p key={question.id} className="rounded-xl border border-red-300/20 bg-red-300/[0.06] p-3 text-xs leading-5 text-red-100">Lücke {question.questionNumber}: richtige Antwort <strong>{correction.correctOptionCode}</strong> · {correction.explanation ?? t('additionalExplanation')}</p>;
              })}
            </div>
          )}
        </article>

        <aside className="order-2 self-start rounded-2xl border border-indigo-300/20 bg-[#0b1720]/95 p-4 shadow-xl shadow-black/20 md:sticky md:top-24" aria-label="Antworten für Lücken">
          <div className="mb-3 flex items-center justify-between gap-3 text-left" dir="ltr">
            <div>
              <h3 className="german text-lg font-black text-white" dir="ltr">Antworten</h3>
              <p className="mt-1 text-xs text-slate-500" dir={direction}>{t('choicesRight')}</p>
            </div>
            <span className="ml-auto inline-flex items-center gap-1 text-xs font-bold text-indigo-200/70" dir={direction}>
              <bdi dir="ltr">{questions.length}</bdi>
              <bdi dir={direction}>{t('gapWordLabel')}</bdi>
            </span>
          </div>
          <div className="space-y-3">
            {questions.map((question) => {
              const value = answers[question.id] ?? '';
              const correction = result?.corrections.find((item) => item.questionId === question.id);
              const selected = selectedQuestionId === question.id;
              return (
                <div key={question.id} className={`rounded-xl border p-3 transition ${selected ? 'border-indigo-300/70 bg-indigo-300/[0.1] shadow-lg shadow-indigo-950/20' : 'border-white/10 bg-white/[0.03]'}`}>
                  <div className="mb-2 flex items-center justify-between gap-2" dir="ltr">
                    <button type="button" onClick={() => chooseGap(question.id)} aria-pressed={selected} className="flex items-center gap-2 text-left">
                      <span className="grid h-7 w-7 place-items-center rounded-lg bg-indigo-400/20 text-xs font-black text-indigo-100">{question.questionNumber}</span>
                      <span className="text-xs font-black text-slate-200">Lücke {question.questionNumber}</span>
                    </button>
                    {correction && <span className={`text-[11px] font-black ${correction.isCorrect ? 'text-emerald-300' : 'text-red-300'}`}>{correction.isCorrect ? '✓' : `→ ${correction.correctOptionCode}`}</span>}
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    {question.options.map((option) => {
                      const isSelected = value === option.code;
                      const isCorrect = Boolean(result && correction?.correctOptionCode === option.code);
                      const isWrong = Boolean(result && isSelected && !correction?.isCorrect);
                      return (
                        <button
                          key={option.code}
                          type="button"
                          disabled={Boolean(result)}
                          onClick={() => chooseOption(question.id, option.code)}
                          aria-pressed={isSelected}
                          className={`min-h-11 rounded-lg border px-2 py-2 text-sm font-black transition ${isSelected ? 'border-cyan-300/70 bg-cyan-300/[0.14] text-cyan-50 shadow-lg shadow-cyan-950/20' : isCorrect ? 'border-emerald-300/60 bg-emerald-300/10 text-emerald-100' : isWrong ? 'border-red-300/60 bg-red-300/10 text-red-100' : 'border-white/10 bg-black/20 text-slate-200 hover:border-indigo-300/50 hover:bg-white/[0.07]'} disabled:cursor-not-allowed disabled:opacity-90`}
                          dir="ltr"
                        >
                          {option.text}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </aside>
      </div>
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

function uniqueChoiceItems(items: Array<{ code: string; text: string }>) {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.code)) return false;
    seen.add(item.code);
    return true;
  });
}

function collectWordBank(questions: ReadingQuestion[]) {
  const seen = new Set<string>();
  const words: Array<{ code: string; text: string }> = [];
  for (const question of questions) {
    for (const option of question.options) {
      if (seen.has(option.code)) continue;
      seen.add(option.code);
      words.push({ code: option.code, text: option.text });
    }
  }
  return words;
}

function GapWordBankView({
  text,
  questions,
  wordBank,
  answers,
  setAnswers,
  result,
}: {
  text: string | null;
  questions: ReadingQuestion[];
  wordBank: Array<{ code: string; text: string }>;
  answers: Record<string, string>;
  setAnswers: Dispatch<SetStateAction<Record<string, string>>>;
  result: ReadingSubmitResult | null;
}) {
  const { direction, t } = useI18n();
  const [selectedGapId, setSelectedGapId] = useState<string | null>(null);
  const [selectedWordCode, setSelectedWordCode] = useState<string | null>(null);
  const questionByNumber = useMemo(() => new Map(questions.map((question) => [question.questionNumber, question])), [questions]);
  const assignedByWord = useMemo(() => new Map(
    questions
      .map((question) => [answers[question.id], question.questionNumber] as const)
      .filter(([code]) => Boolean(code)),
  ), [answers, questions]);
  const answeredCount = questions.filter((question) => Boolean(answers[question.id])).length;

  const assign = (questionId: string, wordCode: string) => {
    setAnswers((current) => {
      const next = { ...current };
      for (const question of questions) {
        if (question.id !== questionId && next[question.id] === wordCode) delete next[question.id];
      }
      next[questionId] = wordCode;
      return next;
    });
    setSelectedGapId(null);
    setSelectedWordCode(null);
  };

  const chooseWord = (wordCode: string) => {
    if (result) return;
    if (selectedGapId) {
      assign(selectedGapId, wordCode);
      return;
    }
    setSelectedWordCode((current) => current === wordCode ? null : wordCode);
  };

  const chooseGap = (questionId: string) => {
    if (result) return;
    if (selectedWordCode) {
      assign(questionId, selectedWordCode);
      return;
    }
    setSelectedGapId((current) => current === questionId ? null : questionId);
  };

  const clearGap = (questionId: string) => {
    if (result) return;
    setAnswers((current) => {
      const { [questionId]: _removed, ...rest } = current;
      return rest;
    });
    setSelectedGapId(null);
    setSelectedWordCode(null);
  };

  const paragraphs = normalizeReadingText(text).split(/\n\s*\n/).filter(Boolean);
  const tokenPattern = /(\{\{\d+\}\}|\(\d+\))/g;

  return (
    <div className="mt-5" dir="ltr">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-300/20 bg-amber-300/[0.06] p-4">
        <div dir={direction}>
          <p className="text-sm font-black text-amber-50">{t('completeWithChoices')}</p>
          <p className="mt-1 text-xs leading-5 text-slate-400">{t('gapInstruction')}</p>
        </div>
        <div className="flex items-center gap-2">
          {selectedGapId && !result && <button type="button" dir={direction} onClick={() => clearGap(selectedGapId)} className="rounded-full border border-red-300/20 px-3 py-2 text-xs font-black text-red-200 hover:bg-red-300/10">{t('clearChoice')}</button>}
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-black text-amber-100" dir={direction}>{t('filledCount', { count: answeredCount, total: questions.length })}</span>
        </div>
      </div>

      <div className="grid items-start gap-5 md:grid-cols-[minmax(0,1fr)_minmax(300px,360px)]">
        <article className="order-1 rounded-2xl border border-white/10 bg-[#12151d]/90 p-5 shadow-xl shadow-black/20" aria-label="Text mit Lücken">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 text-left" dir="ltr">
            <div>
              <h3 className="german text-lg font-black text-white" dir="ltr">Text</h3>
              <p className="mt-1 text-xs text-slate-500" dir={direction}>{t('textLeft')}</p>
            </div>
            <span className="text-xs font-bold text-slate-500" dir="ltr">Sprachbausteine Teil 2</span>
          </div>
          <div className="german space-y-5 text-[15px] leading-8 text-slate-200" dir="ltr">
            {paragraphs.map((paragraph, paragraphIndex) => (
              <p key={paragraphIndex}>
                {paragraph.split(tokenPattern).map((part, partIndex) => {
                  const numberMatch = part.match(/^\{\{(\d+)\}\}$|^\((\d+)\)$/);
                  if (!numberMatch) return <span key={`${paragraphIndex}-${partIndex}`} className="whitespace-pre-wrap">{part}</span>;
                  const questionNumber = Number(numberMatch[1] ?? numberMatch[2]);
                  const question = questionByNumber.get(questionNumber);
                  if (!question) return <span key={`${paragraphIndex}-${partIndex}`}>{part}</span>;
                  const value = answers[question.id] ?? '';
                  const word = wordBank.find((item) => item.code === value);
                  const correction = result?.corrections.find((item) => item.questionId === question.id);
                  const selected = selectedGapId === question.id;
                  return (
                    <button
                      key={`${paragraphIndex}-${partIndex}`}
                      type="button"
                      disabled={Boolean(result)}
                      onClick={() => chooseGap(question.id)}
                      aria-label={`Lücke ${questionNumber}`}
                      aria-pressed={selected}
                      className={`mx-1 inline-flex min-w-24 items-center justify-center rounded-lg border px-3 py-1 align-baseline text-sm font-black transition ${selected ? 'border-amber-300 bg-amber-300/15 text-amber-50 shadow-lg shadow-amber-950/20' : correction?.isCorrect ? 'border-emerald-300/50 bg-emerald-300/10 text-emerald-100' : correction ? 'border-red-300/50 bg-red-300/10 text-red-100' : value ? 'border-cyan-300/50 bg-cyan-300/10 text-cyan-50' : 'border-slate-400/50 bg-slate-900 text-cyan-200 hover:border-amber-300/60'}`}
                    >
                      {word ? word.text : `(${questionNumber})`}
                    </button>
                  );
                })}
              </p>
            ))}
          </div>
          {result && <div className="mt-5 space-y-2 border-t border-white/10 pt-4">{questions.map((question) => { const correction = result.corrections.find((item) => item.questionId === question.id); return correction && !correction.isCorrect ? <p key={question.id} className="rounded-xl border border-red-300/20 bg-red-300/[0.06] p-3 text-xs text-red-100">Lücke {question.questionNumber}: richtige Antwort <strong>{correction.correctOptionCode}</strong> · {correction.explanation ?? t('additionalExplanation')}</p> : null; })}</div>}
        </article>

        <aside className="order-2 self-start rounded-2xl border border-amber-300/20 bg-[#0b1720]/95 p-4 shadow-xl shadow-black/20 md:sticky md:top-24" aria-label="Wortbank">
          <div className="mb-3 flex items-center justify-between gap-3 text-left" dir="ltr">
            <div>
              <h3 className="german text-lg font-black text-white" dir="ltr">Wörter</h3>
              <p className="mt-1 text-xs text-slate-500" dir={direction}>{t('eachWordOnce')}</p>
            </div>
            <span className="ml-auto text-right text-xs font-bold text-amber-200/70" dir={direction}>
              {direction === 'rtl' ? (
                <span className="inline-flex items-center gap-1" dir="ltr">
                  <bdi dir="rtl">{t('wordLabel')}</bdi>
                  <bdi dir="ltr">{wordBank.length}</bdi>
                </span>
              ) : (
                <bdi dir="ltr">{wordBank.length} {t('wordsLabel')}</bdi>
              )}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {wordBank.map((word) => {
              const assignedTo = assignedByWord.get(word.code);
              const selected = selectedWordCode === word.code;
              return (
                <button
                  key={word.code}
                  type="button"
                  disabled={Boolean(result)}
                  onClick={() => chooseWord(word.code)}
                  aria-pressed={selected}
                  className={`min-h-16 rounded-xl border p-3 text-center transition ${selected ? 'border-amber-300/70 bg-amber-300/[0.16] text-white shadow-lg shadow-amber-950/20' : assignedTo ? 'border-cyan-300/30 bg-cyan-300/[0.06] text-slate-300' : 'border-white/10 bg-white/[0.03] text-slate-200 hover:border-amber-300/40 hover:bg-white/[0.07]'} disabled:cursor-not-allowed disabled:opacity-80`}
                  dir="ltr"
                >
                  <span className="block text-[10px] font-black text-amber-200/70">{word.code}</span>
                  <span className="german mt-1 block text-sm font-black">{word.text}</span>
                  {assignedTo && <span className="mt-1 block text-[9px] font-bold text-cyan-200/60">Lücke {assignedTo}</span>}
                </button>
              );
            })}
          </div>
        </aside>
      </div>
    </div>
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
  const { direction, t } = useI18n();
  const visibleOptions = options ?? question.options;
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <p className="german font-bold text-white" dir="ltr">
          {question.questionNumber}. {question.questionText}
        </p>
        {correction && (
          <span dir="ltr" className={`rounded-full px-3 py-1 text-xs font-black ${correction.isCorrect ? 'bg-emerald-400/10 text-emerald-200' : 'bg-red-400/10 text-red-200'}`}>
            {correction.isCorrect ? t('correct') : `${t('correctAnswerLabel')}: ${correction.correctOptionCode}`}
          </span>
        )}
      </div>
      {correction && <p className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-slate-300" dir={direction}>{!correction.selectedOptionCode && <span className="font-bold text-amber-200">{t('noAnswer')} </span>}{correction.explanation ?? t('additionalExplanation')}</p>}
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
