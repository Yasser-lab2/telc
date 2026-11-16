import { useRef, useState } from 'react';
import { useI18n } from '../../lib/i18n';

export function AudioPlayer({ src, remainingPlays, onAuthorizePlay }: { src: string; remainingPlays: number; onAuthorizePlay: () => Promise<void> }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const authorized = useRef(false);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const { t } = useI18n();

  async function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    if (!audio.paused) { audio.pause(); setPlaying(false); return; }
    try {
      if (!authorized.current) { await onAuthorizePlay(); authorized.current = true; }
      await audio.play(); setPlaying(true); setError(null);
    } catch (cause) { setError(cause instanceof Error ? cause.message : t('error')); }
  }

  return (
    <div>
      <audio ref={audioRef} preload="metadata" onTimeUpdate={(event) => { const node = event.currentTarget; setProgress(node.duration ? (node.currentTime / node.duration) * 100 : 0); }} onEnded={() => { authorized.current = false; setPlaying(false); setProgress(100); }}><source src={src} /></audio>
      <div className="kk-player">
        <button type="button" disabled={!authorized.current && remainingPlays <= 0} onClick={() => void toggle()} className="kk-play" aria-label={playing ? t('pauseAudio') : t('playAudio')}>{playing ? 'Ⅱ' : '▶'}</button>
        <div className="kk-player-bar">
          <div className="kk-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)}><div className="kk-progress-fill" style={{ width: `${progress}%` }} /></div>
          <p className="kk-panel-note">{t('remainingListens', { count: remainingPlays })}</p>
        </div>
      </div>
      {error && <p className="kk-error" role="alert">{error}</p>}
    </div>
  );
}
