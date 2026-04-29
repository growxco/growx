import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { MessageCircle, X } from 'lucide-react';
import { whatsappLink } from '@/lib/crm';
import { analytics } from '@/lib/analytics';

const PAGE_INTENTS = [
  { match: /^\/solucoes\/supply-x/, label: 'Supply-X', msg: 'Olá! Quero saber mais sobre o Supply-X (SPI + SPP).' },
  { match: /^\/solucoes\/spi/, label: 'SPI · Indústria', msg: 'Olá! Quero falar sobre o SPI para minha indústria.' },
  { match: /^\/solucoes\/spp/, label: 'SPP · Produtores', msg: 'Olá! Sou produtor e quero saber sobre o SPP.' },
  { match: /^\/solucoes\/growx-app/, label: 'Grow-X App', msg: 'Olá! Quero entrar na lista de espera do Grow-X App.' },
  { match: /^\/produtos\/estacao-meteorologica/, label: 'Estação Meteorológica', msg: 'Olá! Quero orçamento da Estação Meteorológica Grow-X.' },
  { match: /^\/produtos\/modulo-sem-fio/, label: 'Módulo Sem Fio', msg: 'Olá! Quero orçamento do Módulo Sem Fio Grow-X.' },
  { match: /^\/produtos\/estufa-automatizada/, label: 'Estufa Automatizada', msg: 'Olá! Quero orçamento da Estufa Automatizada Grow-X.' },
  { match: /^\/produtos/, label: 'Produtos', msg: 'Olá! Quero saber mais sobre o hardware Grow-X.' },
  { match: /^\/cannabis-medicinal/, label: 'Cannabis medicinal', msg: 'Olá! Sou paciente medicinal e quero saber sobre o Grow-X App.' },
  { match: /^\/parceiros/, label: 'Parceiros', msg: 'Olá! Quero conhecer o programa de parceiros Grow-X.' },
  { match: /^\/demo/, label: 'Demo', msg: 'Olá! Quero agendar uma demo Grow-X.' },
  { match: /.*/, label: 'Grow-X', msg: 'Olá! Quero conversar sobre a Grow-X.' },
];

export default function WhatsAppFloat() {
  const [open, setOpen] = useState(false);
  const [shown, setShown] = useState(false);
  const location = useLocation();

  // Reveal after ~1.2s on first paint
  useEffect(() => {
    const t = setTimeout(() => setShown(true), 1200);
    return () => clearTimeout(t);
  }, []);

  // Reset open on route change
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  const intent = PAGE_INTENTS.find((p) => p.match.test(location.pathname)) ?? PAGE_INTENTS[PAGE_INTENTS.length - 1];

  const onClick = () => {
    analytics.ctaWhatsApp(location.pathname, intent.label);
    window.open(whatsappLink(intent.msg), '_blank', 'noopener');
  };

  if (!shown) return null;

  return (
    <div className="fixed bottom-5 right-5 z-[52] flex flex-col items-end gap-3 sm:bottom-6 sm:right-6">
      {open && (
        <div className="w-72 overflow-hidden rounded-2xl glass-strong shadow-elevated">
          <div className="flex items-center gap-2 border-b border-foreground/10 px-4 py-3">
            <span className="relative flex size-2">
              <span className="absolute inset-0 rounded-full bg-emerald opacity-60 pulse-dot" />
              <span className="relative size-2 rounded-full bg-emerald-glow" />
            </span>
            <span className="text-sm font-semibold text-foreground">Grow-X · WhatsApp</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="ml-auto inline-flex size-7 items-center justify-center rounded-md text-foreground/60 hover:bg-foreground/10 hover:text-foreground"
              aria-label="Fechar"
            >
              <X className="size-3.5" />
            </button>
          </div>
          <div className="space-y-3 p-4">
            <p className="text-sm leading-relaxed text-foreground/85">
              Time disponível agora · Curitiba/PR. Falamos de <span className="font-semibold text-emerald-glow">{intent.label}</span>.
            </p>
            <p className="text-xs text-muted-foreground">
              Sua mensagem inicial: <span className="font-mono text-foreground/70">"{intent.msg}"</span>
            </p>
            <button
              type="button"
              onClick={onClick}
              className="btn-primary w-full"
            >
              <MessageCircle className="size-4" />
              Abrir conversa
            </button>
            <p className="text-[10px] text-muted-foreground">Resposta humana em horário comercial.</p>
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Falar no WhatsApp"
        className="group inline-flex size-14 items-center justify-center rounded-full bg-gradient-to-br from-[oklch(0.760_0.180_145)] to-[oklch(0.620_0.170_145)] text-[oklch(0.13_0.02_150)] shadow-glow-md ring-hairline transition-transform hover:scale-105"
      >
        <span className="absolute inline-flex size-14 rounded-full bg-emerald/40 opacity-0 transition-opacity group-hover:opacity-100 blur-md" />
        <MessageCircle className="relative size-6" strokeWidth={2.25} />
      </button>
    </div>
  );
}
