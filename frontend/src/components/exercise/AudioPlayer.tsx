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

  return <div><audio ref={audioRef} preload="metadata" onTimeUpdate={(event) => { const node = event.currentTarget; setProgress(node.duration ? (node.currentTime / node.duration) * 100 : 0); }} onEnded={() => { authorized.current = false; setPlaying(false); setProgress(100); }}><source src={src} /></audio><div className="flex flex-wrap items-center gap-4"><button type="button" disabled={!authorized.current && remainingPlays <= 0} onClick={() => void toggle()} className="grid h-12 w-12 place-items-center rounded-full bg-accent text-lg font-black text-white disabled:cursor-not-allowed disabled:opacity-40" aria-label={playing ? t('pauseAudio') : t('playAudio')}>{playing ? 'Ⅱ' : '▶'}</button><div className="min-w-40 flex-1"><div className="h-2 overflow-hidden rounded-full bg-border"><div className="h-full bg-accent transition-all" style={{ width: `${progress}%` }} /></div><p className="mt-2 text-xs font-bold text-muted">{t('remainingListens', { count: remainingPlays })}</p></div></div>{error && <p className="mt-3 text-sm text-red-600">{error}</p>}</div>;
}
