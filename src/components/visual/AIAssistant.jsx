import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Send, X, MessageCircle, ArrowRight, Loader2 } from 'lucide-react';
import { analytics } from '@/lib/analytics';
import { whatsappLink } from '@/lib/crm';
import { cn } from '@/lib/utils';

const ENABLED = import.meta.env?.VITE_AI_ASSISTANT_ENABLED !== 'false';

const SUGGESTIONS = [
  'Como o SPI integra com meu ERP?',
  'Pra que serve o Grow-X App?',
  'Posso usar se cultivo por habeas corpus?',
  'Qual a diferença entre SPI, SPP e Supply-X?',
  'Vocês têm hardware pra estufa pequena?',
  'Como funciona o programa de parceiros?',
];

const EASE = [0.16, 1, 0.3, 1];

export default function AIAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]); // {role, content}
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const location = useLocation();
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  // Reset on route change
  useEffect(() => {
    if (open) setOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  if (!ENABLED) return null;

  const send = async (textOverride) => {
    const text = (textOverride ?? input).trim();
    if (!text || loading) return;
    setInput('');
    const next = [...messages, { role: 'user', content: text }];
    setMessages(next);
    setLoading(true);

    try {
      analytics.formStart('ai-chat');
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next, page: location.pathname }),
      });
      if (res.status === 429) {
        setMessages((m) => [...m, { role: 'assistant', content: 'Muitas mensagens em pouco tempo. Tenta de novo em 1 minuto, ou abre o WhatsApp.' }]);
        return;
      }
      const data = await res.json();
      if (data?.text) {
        setMessages((m) => [...m, { role: 'assistant', content: data.text }]);
        analytics.formSubmit('ai-chat', 'assistant');
      } else {
        setMessages((m) => [...m, { role: 'assistant', content: data?.message ?? 'Não consegui responder agora. Tenta o WhatsApp.' }]);
      }
    } catch {
      setMessages((m) => [...m, { role: 'assistant', content: 'Erro de conexão. Tenta o WhatsApp: +55 41 99549-4343.' }]);
    } finally {
      setLoading(false);
    }
  };

  const onWhatsApp = () => {
    analytics.ctaWhatsApp(location.pathname, 'ai_assistant_handoff');
    window.open(whatsappLink('Vim do AI Assistant do site, quero falar com humano sobre Grow-X.'), '_blank', 'noopener');
  };

  return (
    <>
      {/* Trigger — sits next to ThemeToggle in Header (controlled externally if desired) */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Abrir Grow-X AI"
        className="hidden sm:inline-flex items-center gap-2 rounded-lg border border-emerald/30 bg-emerald/10 px-3 h-9 text-xs font-semibold text-emerald-glow transition-all hover:border-emerald/60 hover:bg-emerald/15"
      >
        <Sparkles className="size-3.5" />
        Grow-X AI
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[59] flex items-end justify-end bg-background/60 backdrop-blur-md sm:items-center sm:justify-end sm:p-6"
            onClick={() => setOpen(false)}
            role="dialog"
            aria-modal="true"
            aria-label="Grow-X AI Assistant"
          >
            <motion.aside
              initial={{ x: '100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0 }}
              transition={{ duration: 0.45, ease: EASE }}
              onClick={(e) => e.stopPropagation()}
              className="relative flex h-[88vh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl glass-strong shadow-elevated sm:h-[80vh] sm:rounded-2xl"
            >
              {/* Header */}
              <div className="flex items-center gap-3 border-b border-foreground/10 px-5 py-4">
                <span className="relative inline-flex size-10 items-center justify-center rounded-xl bg-emerald/15 text-emerald-glow ring-hairline">
                  <Sparkles className="size-4" />
                  <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-emerald shadow-[0_0_10px_2px_oklch(0.78_0.20_145/60%)]" />
                </span>
                <div className="leading-tight">
                  <div className="text-sm font-semibold text-foreground">Grow-X AI</div>
                  <div className="font-mono text-[10px] uppercase tracking-wider text-emerald-glow">
                    assistente · beta
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Fechar"
                  className="ml-auto inline-flex size-9 items-center justify-center rounded-lg text-foreground/60 hover:bg-foreground/10 hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              </div>

              {/* Conversation */}
              <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
                {messages.length === 0 && (
                  <>
                    <Bubble role="assistant">
                      Oi — sou o assistente da Grow-X. Posso explicar Supply-X, SPI, SPP, o Grow-X App e nosso hardware.
                      Pra demo real, agendo com nosso time. Em o que ajudo?
                    </Bubble>
                    <div className="space-y-2">
                      <div className="text-eyebrow text-muted-foreground">Sugestões</div>
                      <div className="flex flex-wrap gap-2">
                        {SUGGESTIONS.map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => send(s)}
                            className="rounded-full border border-foreground/10 bg-foreground/[0.04] px-3 py-1.5 text-xs text-foreground/85 transition-colors hover:border-emerald/40 hover:text-foreground"
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {messages.map((m, i) => (
                  <Bubble key={i} role={m.role}>{m.content}</Bubble>
                ))}

                {loading && (
                  <Bubble role="assistant">
                    <span className="inline-flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="size-3.5 animate-spin" />
                      pensando…
                    </span>
                  </Bubble>
                )}
              </div>

              {/* Handoff bar */}
              {messages.length >= 2 && (
                <div className="border-t border-foreground/[0.06] bg-emerald/5 px-5 py-3">
                  <button
                    type="button"
                    onClick={onWhatsApp}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald/10 px-3 py-2 text-xs font-semibold text-emerald-glow ring-hairline transition-colors hover:bg-emerald/15"
                  >
                    <MessageCircle className="size-3.5" />
                    Falar com humano no WhatsApp
                    <ArrowRight className="size-3" />
                  </button>
                </div>
              )}

              {/* Input */}
              <form
                onSubmit={(e) => { e.preventDefault(); send(); }}
                className="flex items-end gap-2 border-t border-foreground/10 p-3"
              >
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  rows={1}
                  placeholder="Pergunte algo sobre a Grow-X…"
                  className="flex-1 resize-none rounded-xl border border-foreground/10 bg-foreground/[0.04] px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-emerald/50 focus:outline-none focus:ring-2 focus:ring-emerald/20"
                />
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  className={cn('btn-primary px-4', (loading || !input.trim()) && 'pointer-events-none opacity-60')}
                  aria-label="Enviar"
                >
                  <Send className="size-4" />
                </button>
              </form>
              <p className="px-4 pb-3 text-[10px] leading-snug text-muted-foreground">
                Beta · respostas geradas por IA. Pra decisão clínica/comercial: confirme com nosso time humano.
              </p>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function Bubble({ role, children }) {
  const isUser = role === 'user';
  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
          isUser
            ? 'bg-emerald text-[oklch(0.13_0.02_150)] font-medium'
            : 'bg-foreground/[0.06] text-foreground ring-hairline whitespace-pre-line',
        )}
      >
        {children}
      </div>
    </div>
  );
}
