import { ArrowUpRight } from 'lucide-react';
import YouTubePlayer from '@/components/visual/YouTubePlayer';
import { Container, Eyebrow } from '@/components/visual';
import { useI18n } from '@/i18n/I18nProvider';

const DEFAULT_COPY = {
  PT: { eyebrow: 'Nossa história', title: 'Conheça a Grow-X.', description: 'Assista ao nosso vídeo institucional.', videoTitle: 'Vídeo institucional da Grow-X' },
  EN: { eyebrow: 'Our story', title: 'Meet Grow-X.', description: 'Watch our institutional video.', videoTitle: 'Grow-X institutional video' },
};

export default function InstitutionalVideo({ videoId = 'q94q18hYyvw', sectionId = 'institucional', copy = DEFAULT_COPY, portrait = false }) {
  const { lang } = useI18n();
  const english = lang === 'EN';
  const content = copy[english ? 'EN' : 'PT'];
  const playLabel = `${english ? 'Play' : 'Reproduzir'} ${content.videoTitle}`;

  return (
    <section id={sectionId} aria-labelledby={`${sectionId}-video-title`} className="scroll-mt-24 pb-16 sm:pb-24">
      <Container>
        <div className="mb-7 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Eyebrow>{content.eyebrow}</Eyebrow>
            <h2 id={`${sectionId}-video-title`} className="mt-4 text-display-lg text-foreground">{content.title}</h2>
            <p className="mt-3 max-w-2xl text-muted-foreground">
              {content.description}
            </p>
          </div>
          <a href={`https://www.youtube.com/watch?v=${videoId}`} target="_blank" rel="noopener noreferrer" className="inline-flex shrink-0 items-center gap-2 rounded text-sm font-semibold text-emerald-glow focus-visible:outline-2 focus-visible:outline-offset-4">
            {english ? 'Watch on YouTube' : 'Assistir no YouTube'}
            <ArrowUpRight className="size-4" aria-hidden="true" />
          </a>
        </div>
        <YouTubePlayer key={videoId} videoId={videoId} title={content.videoTitle} playLabel={playLabel} portrait={portrait} />
      </Container>
    </section>
  );
}
