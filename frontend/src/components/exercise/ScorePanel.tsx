import type { GradingResult } from '../../lib/api';
import { Card } from '../ui/Card';

export function ScorePanel({ result }: { result: GradingResult }) {
  return (
    <Card>
      <h3 className="text-lg font-bold">Résultat Schreiben: {result.score_total}/100</h3>
      <div className="mt-3 grid gap-3 text-sm md:grid-cols-3">
        <div>Inhalt: {result.score_inhalt}/5</div>
        <div>Redemittel: {result.score_redemittel}/5</div>
        <div>Korrektheit: {result.score_korrektheit}/5</div>
      </div>
      <p className="mt-3 text-sm text-muted">Niveau vocabulaire: {result.niveau_vocab}</p>
      <div className="mt-4">
        <h4 className="font-semibold">Feedback</h4>
        <p className="mt-1 text-sm">{result.feedback_ar}</p>
      </div>
      <div className="mt-4 german" dir="ltr">
        <h4 className="font-semibold">Version améliorée</h4>
        <p className="mt-1 whitespace-pre-wrap rounded-md bg-white p-3 text-sm">{result.improved_text}</p>
      </div>
    </Card>
  );
}
