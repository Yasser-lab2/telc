import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ScorePanel } from '../components/exercise/ScorePanel';
import '../components/landing/landing.css';
import { apiClient, type GradingResult } from '../lib/api';
import { useI18n } from '../lib/i18n';
import { formatDate } from '../lib/utils';

const germanCharacters = ['ä', 'ö', 'ü', 'ß', 'Ä', 'Ö', 'Ü', 'ẞ', '„', '“'] as const;

export function SchreibenEditor() {
  const { typeId = '' } = useParams();
  const { direction, locale, t } = useI18n();
  const queryClient = useQueryClient();
  const type = useQuery({ queryKey: ['schreiben', typeId], queryFn: () => apiClient.schreibenType(typeId) });
  const draft = useQuery({ queryKey: ['writing-draft', typeId], queryFn: () => apiClient.startWritingDraft(typeId), enabled: Boolean(type.data) });
  const history = useQuery({ queryKey: ['writing-history'], queryFn: apiClient.writingHistory });
  const hydratedAttempt = useRef<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [text, setText] = useState('');
  const [result, setResult] = useState<GradingResult | null>(null);
  const [saveState, setSaveState] = useState<'saved' | 'saving' | 'error'>('saved');

  useEffect(() => {
    if (draft.data && hydratedAttempt.current !== draft.data.attempt.id) {
      hydratedAttempt.current = draft.data.attempt.id;
      setText(draft.data.draft.text);
      setResult(null);
      setSaveState('saved');
    }
  }, [draft.data]);

  const save = useMutation({
    mutationFn: ({ attemptId, value }: { attemptId: string; value: string }) => apiClient.saveWritingDraft(attemptId, value),
    onSuccess: () => setSaveState('saved'),
    onError: () => setSaveState('error'),
  });

  useEffect(() => {
    if (!draft.data?.attempt.id || result || hydratedAttempt.current !== draft.data.attempt.id) return;
    setSaveState('saving');
    const timer = window.setTimeout(() => save.mutate({ attemptId: draft.data.attempt.id, value: text }), 800);
    return () => window.clearTimeout(timer);
  }, [draft.data?.attempt.id, result, text]);

  const grade = useMutation({
    mutationFn: async () => {
       if (!draft.data || !type.data) throw new Error(t('draftNotReady'));
      await apiClient.saveWritingDraft(draft.data.attempt.id, text);
      return apiClient.grade({
        userText: text, niveau: type.data.type.niveau, themaType: type.data.type.id,
        themaContext: type.data.type.context, attemptId: draft.data.attempt.id,
      });
    },
    onSuccess: (data) => {
      setResult(data.result);
      setSaveState('saved');
      queryClient.invalidateQueries({ queryKey: ['progress'] });
      queryClient.invalidateQueries({ queryKey: ['usage'] });
      queryClient.invalidateQueries({ queryKey: ['writing-history'] });
    },
  });

  if (!type.data || !draft.data) return <p className="kk-panel-body">{t('loading')}</p>;
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;

  function insertCharacter(character: string) {
    if (result) return;
    const textarea = textareaRef.current;
    const start = textarea?.selectionStart ?? text.length;
    const end = textarea?.selectionEnd ?? start;
    setText(`${text.slice(0, start)}${character}${text.slice(end)}`);
    window.requestAnimationFrame(() => {
      textarea?.focus();
      textarea?.setSelectionRange(start + character.length, start + character.length);
    });
  }

  return (
    <div className="kk-dash" dir={direction}>
      <section className="kk-welcome kk-welcome-col">
        <p className="kk-cap" dir="ltr">Schreiben · {type.data.type.niveau}</p>
        <h1 className="kk-welcome-title kk-lesen-title kk-title-md serif" dir="ltr">{type.data.type.title}</h1>
      </section>

      <section className="kk-aufgabe german" dir="ltr">
        <div className="kk-aufgabe-head"><span className="kk-aufgabe-badge mono">AUFGABE</span></div>
        <p>{type.data.type.context}</p>
      </section>

      <section className="kk-panel">
        <div className="kk-panel-head">
          <span className="kk-cap" dir={direction}>{t('wordCount', { count: wordCount })}</span>
          <span className={saveState === 'error' ? 'kk-save-status is-error' : 'kk-save-status'} dir={direction} aria-live="polite">{saveState === 'saving' ? t('saving') : saveState === 'error' ? t('saveFailed') : t('draftSaved')}</span>
        </div>
        <div className="kk-chars">
          <div className="kk-chars-row">
            <span className="kk-cap">{t('germanCharacters')}</span>
            {germanCharacters.map((character) => (
              <button
                key={character}
                type="button"
                disabled={Boolean(result)}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => insertCharacter(character)}
                aria-label={t('insertCharacter', { character })}
                className="kk-char"
              >
                {character}
              </button>
            ))}
          </div>
          <p className="kk-panel-note">{t('insertCharacterHelp')}</p>
        </div>
        <textarea
          ref={textareaRef}
          dir="ltr"
          disabled={Boolean(result)}
          className="kk-input kk-textarea german"
          placeholder="Schreibe deinen Text hier..."
          value={text}
          onChange={(event) => setText(event.target.value)}
        />
        {grade.error && <p className="kk-error" role="alert">{grade.error.message}</p>}
        <button type="button" className="kk-cta kk-cta-inline" disabled={grade.isPending || Boolean(result) || text.length < 30} onClick={() => grade.mutate()}>
          {grade.isPending ? t('correction') : t('gradeWithAi')}
        </button>
      </section>

      {result && (
        <div className="kk-col">
          <ScorePanel result={result} />
          <button type="button" className="kk-ghost-btn" onClick={async () => { hydratedAttempt.current = null; setResult(null); await draft.refetch(); }}>{t('newVersion')}</button>
        </div>
      )}

      <section className="kk-panel">
        <h2 className="kk-panel-title serif">{t('recentHistory')}</h2>
        {history.data?.submissions.length ? (
          <div className="kk-qlist">
            {history.data.submissions.slice(0, 5).map((item) => (
              <div key={item.attemptId} className="kk-hist">
                <div><p className="kk-hist-title" dir="ltr">{item.title}</p><p className="kk-panel-note" dir={direction}>{formatDate(item.submittedAt, locale)}</p></div>
                <strong dir="ltr">{Math.round(item.percentage)}%</strong>
              </div>
            ))}
          </div>
        ) : <p className="kk-panel-body">{t('noCompletedCorrections')}</p>}
      </section>
    </div>
  );
}
