import { useState } from 'react';
import { Play } from 'lucide-react';

export default function YouTubePlayer({ videoId, title, playLabel, portrait = false, onActivate }) {
  const [playing, setPlaying] = useState(false);
  return (
    <div className={`relative overflow-hidden rounded-2xl border border-border bg-black sm:rounded-3xl ${portrait ? 'mx-auto aspect-[9/16] w-full max-w-[360px]' : 'aspect-video'}`}>
      {playing ? (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&playsinline=1`}
          title={title}
          className="absolute inset-0 h-full w-full border-0"
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      ) : (
        <button type="button" onClick={() => { setPlaying(true); onActivate?.(); }} aria-label={playLabel} className="group absolute inset-0 flex h-full w-full items-center justify-center focus-visible:outline-4 focus-visible:-outline-offset-4 focus-visible:outline-emerald-glow">
          <img src={`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`} alt="" width="480" height="360" loading="lazy" className="absolute inset-0 h-full w-full object-cover opacity-80 transition-opacity group-hover:opacity-100" />
          <span className="absolute inset-0 bg-black/20" />
          <span className="relative flex size-16 items-center justify-center rounded-full bg-white text-black shadow-xl transition-transform group-hover:scale-105 sm:size-20">
            <Play className="ml-1 size-7 sm:size-9" fill="currentColor" aria-hidden="true" />
          </span>
        </button>
      )}
    </div>
  );
}
