import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { ScorePanel } from '../components/exercise/ScorePanel';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Textarea } from '../components/ui/Textarea';
import { apiClient, type GradingResult } from '../lib/api';

export function SchreibenEditor() {
  const { typeId = '' } = useParams();
  const type = useQuery({ queryKey: ['schreiben', typeId], queryFn: () => apiClient.schreibenType(typeId) });
  const [text, setText] = useState('');
  const [result, setResult] = useState<GradingResult | null>(null);
  const grade = useMutation({
    mutationFn: apiClient.grade,
    onSuccess: (data) => setResult(data.result),
  });

  if (!type.data) return <p>Chargement...</p>;
  return (
    <div>
      <h1 className="text-3xl font-bold german" dir="ltr">{type.data.type.title}</h1>
      <Card className="mt-5 german" dir="ltr">
        <p>{type.data.type.context}</p>
      </Card>
      <Card className="mt-5">
        <Textarea
          dir="ltr"
          className="german min-h-64"
          placeholder="Schreibe deinen Text hier..."
          value={text}
          onChange={(event) => setText(event.target.value)}
        />
        {grade.error && <p className="mt-3 text-sm text-red-600">{grade.error.message}</p>}
        <Button
          className="mt-4"
          disabled={grade.isPending || text.length < 30}
          onClick={() =>
            grade.mutate({
              userText: text,
              niveau: type.data.type.niveau,
              themaType: type.data.type.id,
              themaContext: type.data.type.context,
            })
          }
        >
          {grade.isPending ? 'Correction...' : 'Corriger avec IA'}
        </Button>
      </Card>
      {result && (
        <div className="mt-5">
          <ScorePanel result={result} />
        </div>
      )}
    </div>
  );
}
