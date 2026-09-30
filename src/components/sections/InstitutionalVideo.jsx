import { useState } from 'react';
import { ArrowUpRight, Play } from 'lucide-react';
import { Container, Eyebrow } from '@/components/visual';
import { useI18n } from '@/i18n/I18nProvider';

const VIDEO_URL = 'https://www.youtube.com/watch?v=q94q18hYyvw';

export default function InstitutionalVideo() {
  const [playing, setPlaying] = useState(false);
  const { lang } = useI18n();
  const english = lang === 'EN';
  const title = english ? 'Meet Grow-X.' : 'Conheça a Grow-X.';
  const playLabel = english ? 'Play the Grow-X institutional video' : 'Reproduzir vídeo institucional da Grow-X';

  return (
    <section id="institucional" aria-labelledby="institutional-video-title" className="scroll-mt-24 pb-16 sm:pb-24">
      <Container>
        <div className="mb-7 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Eyebrow>{english ? 'Our story' : 'Nossa história'}</Eyebrow>
            <h2 id="institutional-video-title" className="mt-4 text-display-lg text-foreground">{title}</h2>
            <p className="mt-3 max-w-2xl text-muted-foreground">
              {english ? 'Watch our institutional video.' : 'Assista ao nosso vídeo institucional.'}
            </p>
          </div>
          <a href={VIDEO_URL} target="_blank" rel="noopener noreferrer" className="inline-flex shrink-0 items-center gap-2 rounded text-sm font-semibold text-emerald-glow focus-visible:outline-2 focus-visible:outline-offset-4">
            {english ? 'Watch on YouTube' : 'Assistir no YouTube'}
            <ArrowUpRight className="size-4" aria-hidden="true" />
          </a>
        </div>
        <div className="relative aspect-video overflow-hidden rounded-2xl border border-border bg-black sm:rounded-3xl">
          {playing ? (
            <iframe
              src="https://www.youtube-nocookie.com/embed/q94q18hYyvw?autoplay=1&rel=0&playsinline=1"
              title={english ? 'Grow-X institutional video' : 'Vídeo institucional da Grow-X'}
              className="absolute inset-0 h-full w-full border-0"
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
          ) : (
            <button type="button" onClick={() => setPlaying(true)} aria-label={playLabel} className="group absolute inset-0 flex h-full w-full items-center justify-center focus-visible:outline-4 focus-visible:-outline-offset-4 focus-visible:outline-emerald-glow">
              <img src="https://i.ytimg.com/vi/q94q18hYyvw/hqdefault.jpg" alt="" width="480" height="360" loading="lazy" className="absolute inset-0 h-full w-full object-cover opacity-80 transition-opacity group-hover:opacity-100" />
              <span className="absolute inset-0 bg-black/20" />
              <span className="relative flex size-16 items-center justify-center rounded-full bg-white text-black shadow-xl transition-transform group-hover:scale-105 sm:size-20">
                <Play className="ml-1 size-7 sm:size-9" fill="currentColor" aria-hidden="true" />
              </span>
            </button>
          )}
        </div>
      </Container>
    </section>
  );
}
