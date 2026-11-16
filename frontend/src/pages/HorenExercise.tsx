import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AudioPlayer } from '../components/exercise/AudioPlayer';
import '../components/landing/landing.css';
import { apiClient } from '../lib/api';
import { useI18n } from '../lib/i18n';
import { formatDate } from '../lib/utils';

type ListeningResult = Awaited<ReturnType<typeof apiClient.submitListeningAttempt>>;

export function HorenExercise() {
  const { audioId = '' } = useParams();
  const { direction, locale, t } = useI18n();
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

  if (!audio.data) return <p className="kk-panel-body">{t('loading')}</p>;
  const remainingPlays = Math.max(0, audio.data.audio.maxPlays - playCount);
  const answered = Object.keys(answers).length;

  async function retry() {
    attemptRef.current = null; setAnswers({}); setPlayCount(0); setResult(null); setSaveStatus('idle');
    await ensureAttempt();
  }

  return (
    <div className="kk-dash" dir={direction}>
      <section className="kk-welcome kk-welcome-col">
        <p className="kk-cap" dir="ltr">Hören · {audio.data.audio.niveau}</p>
        <h1 className="kk-welcome-title kk-lesen-title kk-title-md serif" dir="ltr">{audio.data.audio.title}</h1>
      </section>

      <section className="kk-panel">
        <AudioPlayer src={audio.data.audio.audioUrl} remainingPlays={remainingPlays} onAuthorizePlay={() => play.mutateAsync().then(() => undefined)} />
        {play.error && <p className="kk-error" role="alert">{play.error.message}</p>}
      </section>

      <section className="kk-panel">
        <div className="kk-panel-head">
          <p className="kk-cap">{t('listeningQuestionsAnswered', { answered, total: audio.data.audio.questions.length })}</p>
          <span aria-live="polite" className={saveStatus === 'error' ? 'kk-save-status is-error' : 'kk-save-status'}>{saveStatus === 'saving' ? t('saving') : saveStatus === 'saved' ? t('answersSaved') : saveStatus === 'error' ? t('saveFailed') : ''}</span>
        </div>
        <div className="kk-qlist">
          {audio.data.audio.questions.map((question) => {
            const correction = result?.corrections.find((item) => item.questionId === question.id);
            return (
              <div key={question.id} className="kk-q" dir="ltr">
                <div className="kk-q-top">
                  <p className="kk-q-text german" dir="ltr">{question.prompt}</p>
                  {correction && (
                    <span dir="ltr" className={correction.isCorrect ? 'kk-badge-s is-ok' : 'kk-badge-s is-bad'}>
                      {correction.isCorrect ? <bdi dir={direction}>{t('correct')}</bdi> : <><bdi dir={direction}>{t('answer')}</bdi>: <bdi dir="ltr">{correction.correctOptionCode}</bdi></>}
                    </span>
                  )}
                </div>
                <div className="kk-opts">
                  {question.options.map((option) => (
                    <button key={option.code} type="button" disabled={Boolean(result)} aria-pressed={answers[question.id] === option.code} className={answers[question.id] === option.code ? 'kk-opt is-on' : 'kk-opt'} onClick={() => setAnswers((current) => ({ ...current, [question.id]: option.code }))}>
                      <span className="kk-opt-code">{option.code}</span> · <span dir="ltr">{option.label}</span>
                    </button>
                  ))}
                </div>
                {correction && (
                  <p className="kk-q-exp" dir="ltr">
                    {!correction.selectedOptionCode && <bdi dir={direction} className="kk-warn-text">{t('noAnswer')} </bdi>}
                    <bdi dir="ltr">{correction.explanation ?? t('noExtraExplanation')}</bdi>
                  </p>
                )}
              </div>
            );
          })}
        </div>
        {(submit.error || save.error) && <p className="kk-error" role="alert">{submit.error?.message ?? save.error?.message}</p>}
        {!result ? (
          <button
            type="button"
            className="kk-cta kk-cta-inline"
            disabled={submit.isPending}
            onClick={() => {
              const missing = audio.data.audio.questions.length - answered;
              if (missing > 0 && !window.confirm(`${missing} ${t('noAnswer')} ${t('submitAndCorrect').toLowerCase()} ?`)) return;
              submit.mutate();
            }}
          >
            {submit.isPending ? t('correction') : t('submitAndCorrect')}
          </button>
        ) : (
          <div className="kk-result">
            <h2 className="kk-panel-title serif kk-big" dir="ltr"><bdi dir={direction}>{t('result')}</bdi>: {result.score}/{result.scoreMax} · {result.percentage}%</h2>
            <div className="kk-transcript german" dir="ltr"><p className="kk-cap" dir={direction}>{t('transcript')}</p><p>{result.transcript}</p></div>
            <div className="kk-row-actions">
              <button type="button" className="kk-cta kk-cta-inline" onClick={() => void retry()}>{t('retry')}</button>
              <Link to="/dashboard/horen" className="kk-ghost-btn">{t('returnExercises')}</Link>
            </div>
          </div>
        )}
      </section>

      {history.data?.history.length ? (
        <section className="kk-panel">
          <h2 className="kk-panel-title serif">{t('historyTitle')}</h2>
          <div className="kk-qlist">
            {history.data.history.slice(0, 5).map((item) => (
              <div key={item.id} className="kk-hist"><span>{formatDate(item.submittedAt, locale)}</span><strong>{Math.round(item.percentage)}%</strong></div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
