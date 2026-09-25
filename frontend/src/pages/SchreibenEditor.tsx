import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ScorePanel } from '../components/exercise/ScorePanel';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Textarea } from '../components/ui/Textarea';
import { apiClient, type GradingResult } from '../lib/api';

const germanCharacters = ['ä', 'ö', 'ü', 'ß', 'Ä', 'Ö', 'Ü', 'ẞ', '„', '“'] as const;

export function SchreibenEditor() {
  const { typeId = '' } = useParams();
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
      if (!draft.data || !type.data) throw new Error('Le brouillon n’est pas prêt.');
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

  if (!type.data || !draft.data) return <p>Chargement...</p>;
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
    <div className="space-y-5">
      <div><p className="text-xs font-extrabold uppercase tracking-[0.18em] text-accent">Schreiben · {type.data.type.niveau}</p><h1 className="german mt-2 text-3xl font-black text-ink" dir="ltr">{type.data.type.title}</h1></div>
      <Card className="german" dir="ltr"><p className="text-sm font-bold text-muted">Aufgabe</p><p className="mt-3 leading-7 text-ink">{type.data.type.context}</p></Card>
      <Card>
        <div className="mb-3 flex items-center justify-between text-xs font-bold text-muted"><span>{wordCount} mots</span><span aria-live="polite">{saveState === 'saving' ? 'Enregistrement…' : saveState === 'error' ? 'Échec de sauvegarde' : 'Brouillon enregistré'}</span></div>
        <div className="mb-3 rounded-xl border border-border bg-bg/60 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-xs font-bold text-muted">Caractères allemands :</span>
            {germanCharacters.map((character) => (
              <button
                key={character}
                type="button"
                disabled={Boolean(result)}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => insertCharacter(character)}
                aria-label={`Insérer ${character}`}
                className="grid h-10 min-w-10 place-items-center rounded-lg border border-border bg-surface px-3 text-lg font-black text-ink transition hover:border-accent hover:bg-accentSoft disabled:cursor-not-allowed disabled:opacity-40"
              >
                {character}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted">Cliquez sur un caractère pour l’insérer à la position du curseur.</p>
        </div>
        <Textarea ref={textareaRef} dir="ltr" disabled={Boolean(result)} className="german min-h-72 resize-y" placeholder="Schreibe deinen Text hier..." value={text} onChange={(event) => setText(event.target.value)} />
        {grade.error && <p className="mt-3 text-sm text-red-600">{grade.error.message}</p>}
        <Button className="mt-4" disabled={grade.isPending || Boolean(result) || text.length < 30} onClick={() => grade.mutate()}>{grade.isPending ? 'Correction…' : 'Corriger avec IA'}</Button>
      </Card>
      {result && <div><ScorePanel result={result} /><Button className="mt-4" variant="secondary" onClick={async () => { hydratedAttempt.current = null; setResult(null); await draft.refetch(); }}>Créer une nouvelle version</Button></div>}
      <Card><h2 className="text-xl font-black text-ink">Historique récent</h2>{history.data?.submissions.length ? <div className="mt-4 space-y-3">{history.data.submissions.slice(0, 5).map((item) => <div key={item.attemptId} className="flex items-center justify-between rounded-xl border border-border p-4"><div><p className="font-bold text-ink">{item.title}</p><p className="mt-1 text-xs text-muted">{new Date(item.submittedAt).toLocaleDateString('fr-FR')}</p></div><span className="text-lg font-black text-accent">{Math.round(item.percentage)}%</span></div>)}</div> : <p className="mt-3 text-sm text-muted">Aucune correction terminée pour le moment.</p>}</Card>
    </div>
  );
}
