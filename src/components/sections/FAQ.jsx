import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { Section, GlassCard, Reveal } from '@/components/visual';

/**
 * FAQ accordion + Schema.org FAQPage JSON-LD inline.
 * Uses native semantic <details>-style behavior for a11y but custom motion.
 */
export default function FAQ({
  eyebrow = 'Dúvidas frequentes',
  title = 'Perguntas que recebemos.',
  intro,
  items = [],
}) {
  const [openIdx, setOpenIdx] = useState(0);

  const ld = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((q) => ({
      '@type': 'Question',
      name: q.q,
      acceptedAnswer: { '@type': 'Answer', text: q.a },
    })),
  };

  return (
    <Section eyebrow={eyebrow} title={title} intro={intro} narrow>
      <Helmet><script type="application/ld+json">{JSON.stringify(ld)}</script></Helmet>
      <Reveal>
        <GlassCard variant="surface" className="overflow-hidden">
          <ul className="divide-y divide-foreground/[0.06]">
            {items.map((it, i) => {
              const isOpen = openIdx === i;
              const id = `faq-${i}`;
              return (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => setOpenIdx(isOpen ? -1 : i)}
                    aria-expanded={isOpen}
                    aria-controls={id}
                    className="flex w-full items-center gap-4 px-6 py-5 text-left transition-colors hover:bg-foreground/[0.02] sm:px-8 sm:py-6"
                  >
                    <span className="font-mono text-[11px] uppercase tracking-wider text-emerald-glow">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="flex-1 text-base font-semibold tracking-tight text-foreground sm:text-lg">
                      {it.q}
                    </span>
                    <ChevronDown className={`size-4 shrink-0 text-muted-foreground transition-transform ${isOpen ? 'rotate-180 text-emerald-glow' : ''}`} />
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        id={id}
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                        className="overflow-hidden"
                      >
                        <div className="pb-6 pl-[3.6rem] pr-6 text-sm leading-relaxed text-muted-foreground sm:pb-7 sm:pl-[4.6rem] sm:pr-8 sm:text-base">
                          {it.a}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </li>
              );
            })}
          </ul>
        </GlassCard>
      </Reveal>
    </Section>
  );
}
