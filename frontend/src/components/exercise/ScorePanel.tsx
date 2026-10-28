import type { GradingResult } from '../../lib/api';
import { Card } from '../ui/Card';
import { useI18n } from '../../lib/i18n';

export function ScorePanel({ result }: { result: GradingResult }) {
  const { direction, t } = useI18n();
  return (
    <Card dir={direction}>
      <h3 className="text-lg font-bold">{t('result')} Schreiben: {result.score_total}/100</h3>
      <div className="mt-3 grid gap-3 text-sm md:grid-cols-3">
        <div dir="ltr">Inhalt: {result.score_inhalt}/5</div>
        <div dir="ltr">Redemittel: {result.score_redemittel}/5</div>
        <div dir="ltr">Korrektheit: {result.score_korrektheit}/5</div>
      </div>
      <p className="mt-3 text-sm text-muted">{t('vocabulary')}: <span dir="ltr">{result.niveau_vocab}</span></p>
      <div className="mt-4">
         <h4 className="font-semibold">{t('feedback')}</h4>
        <p className="mt-1 text-sm" dir="auto">{result.feedback_ar}</p>
      </div>
      <div className="mt-4 german" dir="ltr">
        <h4 className="font-semibold">{t('newVersion')}</h4>
        <p className="mt-1 whitespace-pre-wrap rounded-md bg-white p-3 text-sm">{result.improved_text}</p>
      </div>
    </Card>
  );
}
