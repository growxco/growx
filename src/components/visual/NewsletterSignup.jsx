import { useState } from 'react';
import { Send, CheckCircle2, Mail } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { submitLead } from '@/lib/crm';
import { analytics } from '@/lib/analytics';
import { cn } from '@/lib/utils';

/**
 * Inline newsletter signup. Wires through CRM adapter.
 * Variants: 'default' (full card) | 'compact' (inline horizontal)
 */
export default function NewsletterSignup({ variant = 'default', source = 'newsletter', className }) {
  const [email, setEmail] = useState('');
  const [state, setState] = useState('idle');

  const onSubmit = async (e) => {
    e.preventDefault();
    if (state === 'submitting' || !email) return;
    setState('submitting');
    analytics.formStart('newsletter');
    const res = await submitLead(
      { email, _list: 'newsletter' },
      { form: 'newsletter', segment: 'newsletter', source },
    );
    if (res.ok) {
      setState('success');
      analytics.leadCaptured('newsletter', res.mode);
      setEmail('');
    } else {
      setState('error');
    }
  };

  if (state === 'success') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35 }}
        className={cn('flex items-center gap-3 rounded-2xl bg-emerald/15 px-5 py-4 ring-hairline', className)}
      >
        <CheckCircle2 className="size-5 text-emerald-glow" strokeWidth={2.25} />
        <span className="text-sm font-semibold text-foreground">Inscrição confirmada. Até a próxima edição.</span>
      </motion.div>
    );
  }

  if (variant === 'compact') {
    return (
      <form onSubmit={onSubmit} className={cn('flex w-full max-w-md gap-2', className)}>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="seu@email.com"
          aria-label="Seu e-mail"
          className="flex-1 rounded-xl border border-foreground/10 bg-foreground/[0.04] px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-emerald/50 focus:outline-none focus:ring-2 focus:ring-emerald/20"
        />
        <button type="submit" disabled={state === 'submitting'} className="btn-primary shrink-0 px-4">
          <Send className="size-4" />
          <span className="hidden sm:inline">{state === 'submitting' ? 'Enviando…' : 'Inscrever'}</span>
        </button>
      </form>
    );
  }

  return (
    <div className={cn('rounded-2xl glass-strong p-7 ring-hairline sm:p-8', className)}>
      <div className="flex items-start gap-4">
        <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald/15 text-emerald-glow ring-hairline">
          <Mail className="size-5" />
        </span>
        <div className="flex-1">
          <h3 className="font-display text-xl font-bold text-foreground sm:text-2xl">Newsletter Grow-X</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Quinzenal · curadoria + tese + 1 case. Sem spam, sem enrolação.
          </p>
          <form onSubmit={onSubmit} className="mt-5 flex flex-col gap-2 sm:flex-row">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              aria-label="Seu e-mail"
              className="flex-1 rounded-xl border border-foreground/10 bg-foreground/[0.04] px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-emerald/50 focus:outline-none focus:ring-2 focus:ring-emerald/20"
            />
            <button type="submit" disabled={state === 'submitting'} className="btn-primary">
              <Send className="size-4" />
              {state === 'submitting' ? 'Enviando…' : 'Inscrever'}
            </button>
          </form>
          <AnimatePresence>
            {state === 'error' && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="mt-3 text-xs text-[oklch(0.72_0.20_25)]"
              >
                Algo falhou no envio. Tente novamente em instantes.
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
