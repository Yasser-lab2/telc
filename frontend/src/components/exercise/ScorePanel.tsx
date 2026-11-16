import type { GradingResult } from '../../lib/api';
import '../landing/landing.css';
import { useI18n } from '../../lib/i18n';

export function ScorePanel({ result }: { result: GradingResult }) {
  const { direction, t } = useI18n();
  return (
    <section className="kk-panel" dir={direction}>
      <h3 className="kk-panel-title serif kk-big">{t('result')} Schreiben: {result.score_total}/100</h3>
      <div className="kk-scores">
        <div className="kk-ministat" dir="ltr"><p className="kk-cap">Inhalt</p><p className="kk-score serif">{result.score_inhalt}/5</p></div>
        <div className="kk-ministat" dir="ltr"><p className="kk-cap">Redemittel</p><p className="kk-score serif">{result.score_redemittel}/5</p></div>
        <div className="kk-ministat" dir="ltr"><p className="kk-cap">Korrektheit</p><p className="kk-score serif">{result.score_korrektheit}/5</p></div>
      </div>
      <p className="kk-panel-body">{t('vocabulary')}: <span dir="ltr">{result.niveau_vocab}</span></p>
      <div>
        <p className="kk-cap">{t('feedback')}</p>
        <p className="kk-panel-body kk-pre" dir="auto">{result.feedback_ar}</p>
      </div>
      <div className="german" dir="ltr">
        <p className="kk-cap">{t('newVersion')}</p>
        <p className="kk-transcript kk-pre">{result.improved_text}</p>
      </div>
    </section>
  );
}
