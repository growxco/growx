import { useEffect, useRef, useState } from 'react';
import { Play } from 'lucide-react';
import { COOKIE_CONSENT, subscribeCookieConsent } from '@/lib/consent';

const VIDEO_ID = 'q94q18hYyvw';

export default function CompanyVideo() {
  const [state, setState] = useState('poster');
  const playRef = useRef(null);
  const consentRef = useRef(null);
  const closeRef = useRef(null);

  useEffect(() => subscribeCookieConsent((choice) => {
    if (choice !== COOKIE_CONSENT.ACCEPTED) setState('poster');
  }), []);

  useEffect(() => {
    if (state === 'consent') consentRef.current?.focus();
    if (state === 'loaded') closeRef.current?.focus();
  }, [state]);

  const close = () => {
    setState('poster');
    requestAnimationFrame(() => playRef.current?.focus());
  };

  return (
    <div className="company-video" onKeyDown={(event) => {
      if (event.key === 'Escape' && state !== 'poster') close();
    }}>
      <div className="company-video-frame">
        {state === 'loaded' ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${VIDEO_ID}?autoplay=0&rel=0&playsinline=1`}
            title="Grow-X Institucional"
            allow="encrypted-media; picture-in-picture; fullscreen"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        ) : (
          <>
            <img src="/assets/institutional/company-video-poster.jpg" alt="" width="480" height="360" loading="lazy" />
            {state === 'poster' ? (
              <button ref={playRef} type="button" className="company-video-play" onClick={() => setState('consent')} aria-label="Assistir ao vídeo institucional Grow-X">
                <span><Play size={26} fill="currentColor" aria-hidden="true" /></span>
              </button>
            ) : (
              <div className="company-video-consent" role="group" aria-labelledby="company-video-consent-title" aria-describedby="company-video-consent-description">
                <strong id="company-video-consent-title">Carregar vídeo do YouTube?</strong>
                <p id="company-video-consent-description">Ao carregar, você autoriza a conexão com o YouTube para este vídeo. O serviço pode receber dados de navegação. Sua preferência de analytics permanece igual.</p>
                <div>
                  <button ref={consentRef} type="button" className="btn-primary" onClick={() => setState('loaded')}>Carregar vídeo</button>
                  <button type="button" onClick={close}>Agora não</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      <div className="company-video-caption">
        <span>Grow-X Institucional</span>
        {state === 'loaded' && <button ref={closeRef} type="button" onClick={close}>Fechar vídeo</button>}
        <a href={`https://www.youtube.com/watch?v=${VIDEO_ID}`} target="_blank" rel="noopener noreferrer">Assistir no YouTube</a>
      </div>
    </div>
  );
}
