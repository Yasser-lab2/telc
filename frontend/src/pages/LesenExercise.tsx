import { useMutation, useQuery } from '@tanstack/react-query';
import type { Dispatch, SetStateAction } from 'react';
import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiClient, type ReadingQuestion, type ReadingSection, type ReadingSubmitResult } from '../lib/api';

const tabs = [
  { id: 'all', label: 'Prüfungen' },
  { id: 'teil1', label: 'Teil 1' },
  { id: 'teil2', label: 'Teil 2' },
  { id: 'teil3', label: 'Teil 3' },
  { id: 'sprach1', label: 'Sprach 1' },
  { id: 'sprach2', label: 'Sprach 2' },
] as const;

export function LesenExercise() {
  const { themeId = '' } = useParams();
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]['id']>('all');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [result, setResult] = useState<ReadingSubmitResult | null>(null);
  const exam = useQuery({ queryKey: ['reading-exam', themeId], queryFn: () => apiClient.readingExam(themeId) });

  const start = useMutation({
    mutationFn: () => apiClient.startReadingExam(themeId),
    onSuccess: (data) => setSessionId(data.session.id),
  });
  const save = useMutation({
    mutationFn: (id: string) =>
      apiClient.saveReadingAnswers(
        id,
        Object.entries(answers).map(([questionId, selectedOptionCode]) => ({ questionId, selectedOptionCode })),
      ),
  });
  const submit = useMutation({
    mutationFn: async () => {
      const id = sessionId ?? (await apiClient.startReadingExam(themeId)).session.id;
      setSessionId(id);
      await apiClient.saveReadingAnswers(
        id,
        Object.entries(answers).map(([questionId, selectedOptionCode]) => ({ questionId, selectedOptionCode })),
      );
      return apiClient.submitReadingSession(id);
    },
    onSuccess: setResult,
  });

  const visibleSections = useMemo(() => {
    const sections = exam.data?.exam.sections ?? [];
    return activeTab === 'all' ? sections : sections.filter((section) => section.sectionCode === activeTab);
  }, [activeTab, exam.data?.exam.sections]);

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
          <button
            type="button"
            onClick={() => start.mutate()}
            disabled={start.isPending || Boolean(sessionId)}
            className="min-h-11 rounded-2xl border border-teal-300/30 bg-teal-300/10 px-5 text-sm font-black text-teal-100 transition hover:bg-teal-300/20 disabled:opacity-50"
          >
            {sessionId ? 'Session ouverte' : 'Commencer'}
          </button>
        </div>
      </section>

      <div className="flex gap-2 overflow-x-auto rounded-[22px] border border-white/10 bg-[#10141d]/80 p-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold transition ${
              activeTab === tab.id ? 'bg-white text-slate-950' : 'text-slate-400 hover:bg-white/10 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="space-y-5">
        {visibleSections.map((section) => (
          <SectionView key={section.id} section={section} answers={answers} setAnswers={setAnswers} result={result} />
        ))}
      </div>

      <section className="rounded-[24px] border border-white/10 bg-[#12151d]/90 p-5 shadow-xl shadow-black/25">
        {result ? (
          <div>
            <h2 className="text-2xl font-black text-white">Score: {result.score}/{result.scoreMax}</h2>
            <p className="mt-2 text-slate-400">Pourcentage: {result.percentage}%</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={async () => {
                const id = sessionId ?? (await apiClient.startReadingExam(themeId)).session.id;
                setSessionId(id);
                save.mutate(id);
              }}
              className="min-h-11 rounded-2xl border border-white/10 bg-white/[0.04] px-5 text-sm font-bold text-slate-200 hover:bg-white/10"
            >
              Sauvegarder
            </button>
            <button
              type="button"
              onClick={() => submit.mutate()}
              disabled={submit.isPending}
              className="min-h-11 rounded-2xl border border-teal-300/30 bg-teal-300/10 px-5 text-sm font-black text-teal-100 hover:bg-teal-300/20 disabled:opacity-50"
            >
              {submit.isPending ? 'Correction...' : 'Soumettre et corriger'}
            </button>
          </div>
        )}
      </section>
    </div>
  );
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
      <div className="mt-3 grid gap-2 md:grid-cols-3">
        {question.options.map((option) => (
          <button
            key={option.id}
            type="button"
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
