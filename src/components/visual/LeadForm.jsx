import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, CheckCircle2, AlertTriangle } from 'lucide-react';
import { submitLead, scoreLead } from '@/lib/crm';
import { analytics } from '@/lib/analytics';
import { cn } from '@/lib/utils';

/**
 * Form de captura reutilizável.
 * Props:
 *   - form (string) — identificador do form (ex.: 'demo', 'waitlist-app')
 *   - segment (string) — 'industrial' | 'producer' | 'cultivo' | 'cannabis' | 'partner' | 'press'
 *   - fields (array) — config de campos: { name, label, type, required, options?, placeholder? }
 *   - submitLabel (string)
 *   - successTitle, successText
 *   - extra (object) — extra payload to merge
 *   - onSuccess (fn) — callback after success
 */
export default function LeadForm({
  form,
  segment,
  fields,
  submitLabel = 'Enviar',
  successTitle = 'Mensagem recebida.',
  successText = 'Em até 1 dia útil, nosso time entra em contato.',
  extra = {},
  onSuccess,
}) {
  const [data, setData] = useState({});
  const [errors, setErrors] = useState({});
  const [state, setState] = useState('idle'); // idle | submitting | success | error
  const [touched, setTouched] = useState(false);

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (!touched) {
      setTouched(true);
      analytics.formStart(form);
    }
    setData((d) => ({ ...d, [name]: type === 'checkbox' ? checked : value }));
    setErrors((current) => {
      if (!current[name]) return current;
      const next = { ...current };
      delete next[name];
      return next;
    });
    if (state === 'error') setState('idle');
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (state === 'submitting') return;

    const nextErrors = validateFields(fields, data);
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      setState('idle');
      return;
    }

    setState('submitting');

    const score = scoreLead({
      segment,
      role: data.role,
      companySize: data.companySize,
      urgency: data.urgency,
      hasEmail: !!data.email,
    });

    const res = await submitLead(
      { ...data, ...extra, _score: score },
      { form, segment, source: 'site' },
    );

    if (res.ok) {
      setState('success');
      analytics.leadCaptured(segment, res.mode);
      if (score >= 50) analytics.formQualified(form, score);
      onSuccess?.(res);

      // Fire-and-forget AI enrichment (server-side; never blocks UX)
      try {
        const enrichRes = await fetch('/api/enrich-lead', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...data, segment }),
        });
        const enrichment = await enrichRes.json().catch(() => null);
        if (enrichment?.ok && enrichment.score >= 70) {
          analytics.formQualified(form, enrichment.score);
        }
      } catch { /* swallow — enrichment is non-critical */ }
    } else {
      setState('error');
    }
  };

  if (state === 'success') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col items-center gap-4 py-6 text-center"
      >
        <span className="inline-flex size-14 items-center justify-center rounded-2xl bg-emerald/20 text-emerald-glow ring-hairline shadow-glow-md">
          <CheckCircle2 className="size-7" strokeWidth={2.25} />
        </span>
        <h3 className="font-display text-2xl font-bold text-foreground">{successTitle}</h3>
        <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">{successText}</p>
      </motion.div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <input type="hidden" name="_form" value={form} />
      <input type="hidden" name="_segment" value={segment} />

      {fields.map((f) => (
        <Field
          key={f.name}
          field={f}
          value={data[f.name] ?? ''}
          error={errors[f.name]}
          onChange={onChange}
        />
      ))}

      <button
        type="submit"
        disabled={state === 'submitting'}
        className={cn('btn-primary w-full', state === 'submitting' && 'pointer-events-none opacity-70')}
      >
        <Send className="size-4" />
        {state === 'submitting' ? 'Enviando…' : submitLabel}
      </button>

      <AnimatePresence>
        {state === 'error' && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-start gap-3 rounded-xl border border-[oklch(0.62_0.22_25/30%)] bg-[oklch(0.62_0.22_25/8%)] p-3 text-sm text-foreground/85"
          >
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-[oklch(0.72_0.20_25)]" />
            Algo falhou no envio. Tente novamente — ou fale direto pelo WhatsApp.
          </motion.div>
        )}
      </AnimatePresence>

      <p className="text-[10px] leading-relaxed text-muted-foreground">
        Ao enviar, você concorda em ser contatado pela Grow-X. Conforme a LGPD, seus dados são usados apenas pra esse contato.
      </p>
    </form>
  );
}

function validateFields(fields, data) {
  return fields.reduce((acc, field) => {
    const value = data[field.name];
    const isEmpty = field.type === 'checkbox'
      ? value !== true
      : String(value ?? '').trim().length === 0;

    if (field.required && isEmpty) {
      acc[field.name] = 'Preencha este campo.';
      return acc;
    }

    if (field.type === 'email' && !isEmpty && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value))) {
      acc[field.name] = 'Informe um e-mail válido.';
    }

    return acc;
  }, {});
}

function Field({ field, value, error, onChange }) {
  const { name, label, type = 'text', required, options, placeholder, hint } = field;
  const id = `f-${name}`;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-eyebrow text-foreground/80">
        {label}{required && <span className="text-emerald-glow"> *</span>}
      </label>
      {type === 'select' ? (
        <select
          id={id}
          name={name}
          value={value}
          onChange={onChange}
          required={required}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={describedBy}
          className="w-full rounded-xl border border-foreground/10 bg-foreground/[0.03] px-4 py-3 text-sm text-foreground focus:border-emerald/50 focus:outline-none focus:ring-2 focus:ring-emerald/20"
        >
          <option value="">{placeholder ?? 'Selecione…'}</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      ) : type === 'textarea' ? (
        <textarea
          id={id}
          name={name}
          value={value}
          onChange={onChange}
          required={required}
          rows={5}
          placeholder={placeholder}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={describedBy}
          className="w-full resize-none rounded-xl border border-foreground/10 bg-foreground/[0.03] px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-emerald/50 focus:outline-none focus:ring-2 focus:ring-emerald/20"
        />
      ) : type === 'checkbox' ? (
        <input
          id={id}
          name={name}
          type="checkbox"
          checked={Boolean(value)}
          onChange={onChange}
          required={required}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={describedBy}
          className="size-4 rounded border-foreground/20 bg-foreground/[0.03] accent-emerald"
        />
      ) : (
        <input
          id={id}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          required={required}
          placeholder={placeholder}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={describedBy}
          className="w-full rounded-xl border border-foreground/10 bg-foreground/[0.03] px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-emerald/50 focus:outline-none focus:ring-2 focus:ring-emerald/20"
        />
      )}
      {hint && <p id={hintId} className="mt-1.5 text-[11px] text-muted-foreground">{hint}</p>}
      {error && (
        <p id={errorId} role="alert" className="mt-1.5 text-[11px] font-medium text-[oklch(0.78_0.16_35)]">
          {error}
        </p>
      )}
    </div>
  );
}
