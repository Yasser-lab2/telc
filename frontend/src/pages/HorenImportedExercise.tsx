import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Icon } from '../components/landing/icons';
import '../components/landing/landing.css';
import importedTeil1 from '../data/zertify-horen-teil1.json';
import importedTeil2 from '../data/zertify-horen-teil2.json';
import importedTeil3 from '../data/zertify-horen-teil3.json';
import { useI18n } from '../lib/i18n';

const importedLibraries = { teil1: importedTeil1, teil2: importedTeil2, teil3: importedTeil3 } as const;

export function HorenImportedExercise() {
  const { direction, t } = useI18n();
  const { teil = 'teil1', exerciseId = '' } = useParams();
  const library = importedLibraries[teil as keyof typeof importedLibraries];
  const exercise = useMemo(() => library?.exercises.find((item) => item.id === exerciseId), [exerciseId, library]);
  const [answers, setAnswers] = useState<Record<number, 'R' | 'F'>>({});

  if (!exercise) {
    return (
      <div className="kk-dash" dir={direction}>
        <p className="kk-error" role="alert">{t('exerciseNotFound')}</p>
        <Link className="kk-ghost-btn" to="/dashboard/horen"><Icon name="arrowRight" size={16} className="kk-arrow kk-flip" />{t('returnToListening')}</Link>
      </div>
    );
  }

  return (
    <div className="kk-dash" dir={direction}>
      <Link to="/dashboard/horen" className="kk-ghost-btn kk-ghost-sm"><Icon name="arrowRight" size={14} className="kk-arrow kk-flip" />{t('returnExercises')}</Link>

      <section className="kk-welcome kk-welcome-col">
        <p className="kk-cap" dir="ltr">Hören · B2 · Teil {exercise.teil}</p>
        <h1 className="kk-welcome-title kk-lesen-title kk-title-md serif" dir="ltr">{exercise.title}</h1>
        <p className="kk-welcome-sub">{t('importedListeningInstruction')}</p>
      </section>

      <section className="kk-panel">
        {exercise.audioUrl
          ? <audio className="kk-audio-native" controls preload="metadata" src={exercise.audioUrl} />
          : <div className="kk-notice kk-notice-neutral">{t('audioUnavailable')}</div>}
      </section>

      <section className="kk-panel">
        <div className="kk-panel-head">
          <h2 className="kk-panel-title serif" dir={direction}>{t('statements')}</h2>
          <span className="kk-chip-soft" dir="ltr">{t('statementsAnswered', { answered: Object.keys(answers).length, total: exercise.statements.length })}</span>
        </div>
        <div className="kk-qlist">
          {exercise.statements.map((statement) => (
            <div key={statement.number} className="kk-q kk-q-row" dir="ltr">
              <p className="kk-q-text german"><span className="kk-q-n mono">{statement.number}.</span>{statement.text}</p>
              <div className="kk-rf">
                {([['R', 'Richtig', t('trueLabel')], ['F', 'Falsch', t('falseLabel')]] as const).map(([code, germanLabel, label]) => (
                  <button key={code} type="button" aria-pressed={answers[statement.number] === code} className={answers[statement.number] === code ? 'kk-opt is-on' : 'kk-opt'} onClick={() => setAnswers((current) => ({ ...current, [statement.number]: code }))}>
                    <span className="german" dir="ltr">{germanLabel}</span> · <bdi dir={direction}>{label}</bdi>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="kk-notice kk-notice-neutral">{t('trainingMode')}</div>
      </section>
    </div>
  );
}
