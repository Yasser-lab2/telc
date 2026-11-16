import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { Icon } from '../components/landing/icons';
import '../components/landing/landing.css';
import { apiClient } from '../lib/api';
import { useI18n } from '../lib/i18n';
import { formatDate, formatDateTime } from '../lib/utils';

export function Speaking() {
  const { direction, locale, t } = useI18n();
  const queryClient = useQueryClient();
  const catalog = useQuery({ queryKey: ['speaking'], queryFn: apiClient.speaking });
  const history = useQuery({ queryKey: ['speaking-history'], queryFn: apiClient.speakingHistory });
  const [selected, setSelected] = useState('');
  const [consent, setConsent] = useState(false);
  const [recording, setRecording] = useState(false);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [seconds, setSeconds] = useState(0);
  const recorder = useRef<MediaRecorder | null>(null);
  const timer = useRef<number | null>(null);
  const upload = useMutation({
    mutationFn: () => {
      if (!blob || !selected) throw new Error(t('recordingMissing'));
      return apiClient.uploadSpeaking(selected, blob, seconds, consent);
    },
    onSuccess: () => { setBlob(null); setSeconds(0); queryClient.invalidateQueries({ queryKey: ['speaking-history'] }); },
  });
  const remove = useMutation({ mutationFn: apiClient.deleteSpeaking, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['speaking-history'] }) });

  async function start() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const chunks: Blob[] = [];
    const media = new MediaRecorder(stream);
    recorder.current = media;
    media.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
    media.onstop = () => {
      setBlob(new Blob(chunks, { type: media.mimeType || 'audio/webm' }));
      stream.getTracks().forEach((track) => track.stop());
    };
    media.start();
    setRecording(true);
    setSeconds(0);
    timer.current = window.setInterval(() => setSeconds((value) => value + 1), 1000);
  }
  function stop() {
    recorder.current?.stop();
    setRecording(false);
    if (timer.current) window.clearInterval(timer.current);
  }
  const prompt = catalog.data?.prompts.find((item) => item.id === selected);

  return (
    <div className="kk-dash" dir={direction}>
      <section className="kk-welcome kk-welcome-col">
        <p className="kk-cap">Sprechen</p>
        <h1 className="kk-welcome-title kk-lesen-title kk-title-md serif">{t('speakingPractice')}</h1>
        <p className="kk-welcome-sub">{t('speakingDescription')}</p>
      </section>

      <section className="kk-panel">
        <div className="kk-field">
          <label className="kk-label" htmlFor="speaking-topic">{t('topic')}</label>
          <select id="speaking-topic" className="kk-input kk-select" value={selected} onChange={(event) => setSelected(event.target.value)}>
            <option value="">{t('chooseTopicOption')}</option>
            {catalog.data?.prompts.map((item) => <option key={item.id} value={item.id}>{item.title} · {item.level}</option>)}
          </select>
        </div>

        {prompt && (
          <div className="kk-aufgabe german" dir="ltr">
            <div className="kk-aufgabe-head"><span className="kk-aufgabe-badge mono">THEMA</span></div>
            <h2 className="kk-q-text">{prompt.title}</h2>
            <p className="kk-pre">{prompt.instructions ?? prompt.description}</p>
          </div>
        )}

        <label className="kk-check">
          <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
          <span>{t('recordingConsent')}</span>
        </label>

        <div className="kk-row-actions">
          {recording
            ? <button type="button" className="kk-cta kk-cta-inline kk-rec" onClick={stop}><span className="kk-rec-dot" aria-hidden="true" />{t('stopRecording')} · {seconds}s</button>
            : <button type="button" className="kk-cta kk-cta-inline" disabled={!selected || !consent} onClick={() => void start()}><Icon name="mic" size={18} />{t('startRecording')}</button>}
          {blob && (
            <>
              <audio className="kk-audio-native kk-audio-inline" controls src={URL.createObjectURL(blob)} />
              <button type="button" className="kk-ghost-btn" disabled={upload.isPending} onClick={() => upload.mutate()}>{upload.isPending ? t('saving') : t('saveRecording')}</button>
            </>
          )}
        </div>
        {catalog.data && !catalog.data.prompts.length && <p className="kk-notice kk-notice-neutral">{t('noSpeakingTopics')}</p>}
        {upload.error && <p className="kk-error" role="alert">{upload.error.message}</p>}
      </section>

      <section className="kk-panel">
        <h2 className="kk-panel-title serif kk-big">{t('recordings')}</h2>
        <div className="kk-qlist">
          {history.data?.submissions.map((item) => (
            <div key={item.id} className="kk-q">
              <div className="kk-rec-row">
                <div>
                  <p className="kk-q-text" dir="ltr">{item.title}</p>
                  <p className="kk-panel-note">{formatDateTime(item.createdAt, locale)} · {item.status === 'reviewed' ? t('reviewed') : t('pendingReview')} · {t('deleteOn', { date: formatDate(item.deleteAfter, locale) })}</p>
                </div>
                <div className="kk-rec-tools">
                  <audio className="kk-audio-native kk-audio-inline" controls crossOrigin="use-credentials" preload="none" src={apiClient.speakingRecordingUrl(item.id)} />
                  <button type="button" className="kk-ghost-btn kk-ghost-sm kk-danger" onClick={() => { if (confirm(t('deleteRecording'))) remove.mutate(item.id); }}>{t('delete')}</button>
                </div>
              </div>
              {item.feedback && (
                <div className="kk-notice" role="note">
                  <p className="kk-q-text">{t('pedagogicalScore')}: {item.feedback.percentage} %</p>
                  <p>{t('pronunciation')} {item.feedback.pronunciation}/5 · {t('fluency')} {item.feedback.fluency}/5 · {t('vocabulary')} {item.feedback.vocabulary}/5 · {t('taskAchievement')} {item.feedback.taskAchievement}/5</p>
                  <p dir="auto">{item.feedback.feedback}</p>
                </div>
              )}
            </div>
          ))}
          {history.data && !history.data.submissions.length && <p className="kk-panel-body">{t('noSavedRecordings')}</p>}
        </div>
      </section>
    </div>
  );
}
