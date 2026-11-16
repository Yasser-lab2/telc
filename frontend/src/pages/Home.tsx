import { Fragment, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Icon, type IconName } from '../components/landing/icons';
import { LandingFooter, LandingHeader } from '../components/landing/LandingChrome';
import '../components/landing/landing.css';
import { useI18n } from '../lib/i18n';

/** Wraps the last word of a sentence in the highlighted italic span used by the Kolchi Klar headings. */
function withHighlight(text: string): ReactNode {
  const match = text.match(/^(.*\s)(\S+?)([.!?…]*)$/u);
  if (!match) return text;
  return <>{match[1]}<span className="kk-hl">{match[2]}</span>{match[3]}</>;
}

export function Home() {
  const { direction, t } = useI18n();
  const skills: Array<{ n: string; icon: IconName; title: string; tag: string; body: string; foot: string }> = [
    { n: '01', icon: 'book', title: 'Lesen', tag: 'Teil 1–3', body: t('moduleReadingBody'), foot: t('skillReadingFoot') },
    { n: '02', icon: 'headphones', title: 'Hören', tag: 'Audio', body: t('moduleListeningBody'), foot: t('skillListeningFoot') },
    { n: '03', icon: 'pen', title: 'Schreiben', tag: 'Briefe & E-Mails', body: t('moduleWritingBody'), foot: t('skillWritingFoot') },
    { n: '04', icon: 'mic', title: 'Sprechen', tag: 'Mündliche Prüfung', body: t('moduleSpeakingBody'), foot: t('skillSpeakingFoot') },
  ];
  const points = [t('pointPrice'), t('pointSchedule'), t('pointExam')];

  return (
    <div className="kk" dir={direction}>
      <LandingHeader />
      <main id="main-content" tabIndex={-1} style={{ outline: 'none' }}>
        <section className="kk-wrap kk-hero">
          <div>
            <span className="kk-pill"><span className="kk-dot" />{t('betaFree')}<span style={{ opacity: 0.5 }}>/</span><span style={{ fontWeight: 400, opacity: 0.8 }}>B1 &amp; B2</span></span>
            <div className="kk-eyebrow mono">00 · {t('heroEyebrow')}</div>
            <h1 className="kk-h1 serif">{withHighlight(t('homeHeroTitle'))}</h1>
            <p className="kk-lead">{t('homeDescription')}</p>
            <div className="kk-cta-row">
              <Link to="/register" className="kk-cta">{t('register')}<Icon name="arrowRight" size={20} /></Link>
              <span className="kk-tag mono">{t('modularTag')}</span>
            </div>
            <p className="kk-note">{t('homeBetaNote')}</p>
            <div className="kk-stats">
              <div><div className="kk-stat-v serif">{t('statPractice')}</div><div className="kk-stat-l">{t('statPracticeLabel')}</div></div>
              <div><div className="kk-stat-v serif">4/4</div><div className="kk-stat-l">{t('statSkills')}</div></div>
              <div><div className="kk-stat-v serif">{t('statInstant')}</div><div className="kk-stat-l">{t('statInstantLabel')}</div></div>
            </div>
          </div>

          <div className="kk-card">
            <div className="kk-card-bar top">
              <span className="kk-card-title mono"><span className="kk-card-dot" />{t('homeAssistant')} / Schreiben · B1</span>
              <span className="kk-chip mono"><Icon name="timer" size={13} />{t('minutes', { count: 30 })}</span>
            </div>
            <div className="kk-card-body">
              <div className="kk-aufgabe german" dir="ltr">
                <div className="kk-aufgabe-head" dir={direction}><span className="kk-aufgabe-badge mono">AUFGABE</span><span className="kk-aufgabe-sub">{t('officialTask')}</span></div>
                <p>Sie möchten an einem Deutschkurs teilnehmen. Fragen Sie nach dem Preis, den Kurszeiten und der Prüfungsvorbereitung.</p>
              </div>
              <div className="kk-editor german">
                <div dir="ltr">
                  <p>Sehr geehrte Damen und Herren,</p>
                  <p>ich interessiere mich für Ihren Deutschkurs<span className="kk-caret" /></p>
                </div>
                <div className="kk-editor-foot" dir={direction}>
                  <span className="ok"><Icon name="checkCircle" size={16} />{t('structureOk')}</span>
                  <span className="mono">{t('pointsToCover')}</span>
                </div>
              </div>
              <div className="kk-points">
                {points.map((label) => <div key={label} className="kk-point"><span>{label}</span><b className="mono">{t('pending')}</b></div>)}
              </div>
            </div>
            <div className="kk-card-bar bottom">
              <span className="kk-save mono"><i />{t('savedDraftShort')}</span>
              <span className="kk-ai"><Icon name="wand" size={16} />{t('aiCorrection')}</span>
            </div>
          </div>
        </section>

        <section className="kk-band">
          <div className="kk-wrap">
            <span className="kk-section-eyebrow mono">{t('clearPath')}</span>
            <h2 className="kk-h2 serif">{withHighlight(t('skillFocus'))}</h2>
            <p className="kk-h2-sub">{t('skillFocusBody')}</p>
            <div className="kk-grid4">
              {skills.map((skill) => (
                <article key={skill.title} className="kk-skill">
                  <div>
                    <div className="kk-skill-top"><span className="kk-skill-n mono">{skill.n}</span><span className="kk-skill-ico"><Icon name={skill.icon} size={22} /></span></div>
                    <h3 className="german" dir="ltr">{skill.title}<small className="mono">{skill.tag}</small></h3>
                    <p>{skill.body}</p>
                  </div>
                  <div className="kk-skill-foot mono"><span>{skill.foot}</span><Icon name="arrowRight" size={16} /></div>
                </article>
              ))}
            </div>
            <div className="kk-tip">
              <span className="kk-tip-l"><Icon name="bulb" size={20} /><span><strong>{t('tipLabel')}</strong> {t('tipBody')}</span></span>
              <Link to="/pricing">{t('learnMore')}<Icon name="chevronRight" size={16} /></Link>
            </div>
          </div>
        </section>

        <section className="kk-wrap kk-final">
          <div className="kk-final-in">
            <span className="kk-badge mono">{t('homeCtaTitle')}</span>
            <h2 className="kk-h2 serif">{withHighlight(t('homeCtaTitle'))}</h2>
            <p className="kk-lead">{t('homeCtaBody')}</p>
            <Link to="/register" className="kk-cta" style={{ paddingInline: '2.5rem' }}>{t('registerNow')}<Icon name="arrowRight" size={20} /></Link>
            <div className="kk-checks mono">
              {[t('checkNoCard'), t('checkMethod'), t('checkRegion')].map((label) => <Fragment key={label}><span><Icon name="check" size={16} />{label}</span></Fragment>)}
            </div>
          </div>
        </section>
      </main>
      <LandingFooter />
    </div>
  );
}
