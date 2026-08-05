import { useEffect, useRef, useState } from 'react';
import { useTheme } from '@/components/visual/ThemeProvider';

const SCRIPT_ID = 'cloudflare-turnstile-script';
const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

let scriptPromise;

function loadTurnstile() {
  if (globalThis.turnstile) return Promise.resolve(globalThis.turnstile);
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById(SCRIPT_ID);
    const script = existing || document.createElement('script');

    const ready = () => {
      if (globalThis.turnstile) resolve(globalThis.turnstile);
      else reject(new Error('turnstile_not_available'));
    };
    const failed = () => reject(new Error('turnstile_script_failed'));

    script.addEventListener('load', ready, { once: true });
    script.addEventListener('error', failed, { once: true });
    if (!existing) {
      script.id = SCRIPT_ID;
      script.src = SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
  }).catch((error) => {
    scriptPromise = undefined;
    throw error;
  });

  return scriptPromise;
}

export default function TurnstileWidget({ siteKey, resetKey, onToken, onUnavailable }) {
  const { theme } = useTheme();
  const container = useRef(null);
  const widgetId = useRef(null);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    if (!siteKey || !container.current) {
      setStatus('unavailable');
      onUnavailable?.();
      return undefined;
    }

    let active = true;
    let api;
    loadTurnstile()
      .then((turnstile) => {
        if (!active || !container.current) return;
        api = turnstile;
        widgetId.current = turnstile.render(container.current, {
          sitekey: siteKey,
          action: 'prevenda_checkout',
          theme,
          size: 'flexible',
          appearance: 'interaction-only',
          callback: (token) => {
            if (!active) return;
            setStatus('verified');
            onToken(token);
          },
          'expired-callback': () => {
            if (!active) return;
            setStatus('expired');
            onToken('');
          },
          'error-callback': () => {
            if (!active) return;
            setStatus('unavailable');
            onToken('');
            onUnavailable?.();
          },
        });
      })
      .catch(() => {
        if (!active) return;
        setStatus('unavailable');
        onUnavailable?.();
      });

    return () => {
      active = false;
      onToken('');
      if (api && widgetId.current !== null) api.remove(widgetId.current);
      widgetId.current = null;
    };
  }, [onToken, onUnavailable, resetKey, siteKey, theme]);

  return (
    <div className="mt-4" aria-live="polite">
      <div ref={container} className="min-h-0 w-full overflow-hidden rounded-lg" />
      {status === 'loading' && <p className="text-xs" style={{ color: 'var(--prevenda-muted)' }}>Preparando a verificação de segurança…</p>}
      {status === 'expired' && <p className="text-xs" style={{ color: 'var(--prevenda-warning)' }}>A verificação expirou. Conclua novamente para continuar.</p>}
      {status === 'unavailable' && <p role="alert" className="text-xs" style={{ color: 'var(--prevenda-warning)' }}>A verificação de segurança está indisponível. Nenhuma reserva será aberta.</p>}
    </div>
  );
}
