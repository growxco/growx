import { useEffect, useState } from 'react';
import { Cookie, X } from 'lucide-react';
import { Container } from '@/components/visual';

const KEY = 'growx-cookie-consent';

export default function CookieBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const choice = localStorage.getItem(KEY);
    if (!choice) {
      const id = setTimeout(() => setShow(true), 1200);
      return () => clearTimeout(id);
    }
  }, []);

  const decide = (accept) => {
    localStorage.setItem(KEY, accept ? 'accepted' : 'declined');
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[55] px-4 pb-4 sm:px-6 sm:pb-6">
      <Container className="!px-0">
        <div className="mx-auto max-w-3xl">
          <div className="overflow-hidden rounded-2xl glass-strong shadow-elevated">
            <div className="flex flex-col items-start gap-4 p-5 sm:flex-row sm:items-center sm:gap-6">
              <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald/15 text-emerald-glow ring-hairline">
                <Cookie className="size-4" />
              </span>
              <div className="flex-1 text-sm leading-relaxed text-foreground/85">
                Usamos cookies pra entender como você navega e melhorar a experiência.
                Sem rastreio invasivo. <span className="text-muted-foreground">Conforme a LGPD · </span>
                <a href="/cookies" className="text-emerald-glow hover:underline">detalhes</a>.
              </div>
              <div className="flex w-full shrink-0 gap-2 sm:w-auto">
                <button onClick={() => decide(false)} className="btn-ghost flex-1 sm:flex-initial">
                  Recusar
                </button>
                <button onClick={() => decide(true)} className="btn-primary flex-1 sm:flex-initial">
                  Aceitar
                </button>
                <button
                  type="button"
                  onClick={() => setShow(false)}
                  aria-label="Fechar"
                  className="inline-flex size-10 items-center justify-center rounded-lg border border-foreground/10 bg-foreground/5 text-foreground/70 hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
}
