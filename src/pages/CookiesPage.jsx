import { useEffect, useState } from 'react';
import { Cookie, Check, X } from 'lucide-react';
import { SEO, Container, Eyebrow, Reveal, GlassCard, Aurora, GridPattern } from '@/components/visual';

const COOKIES = [
  {
    cat: 'Essenciais',
    required: true,
    items: [
      { name: 'growx-theme', purpose: 'Lembrar tema escolhido (escuro/claro).', vendor: 'Grow-X', duration: 'Persistente' },
      { name: 'growx-lang', purpose: 'Lembrar idioma (PT/EN).', vendor: 'Grow-X', duration: 'Persistente' },
      { name: 'growx-cookie-consent', purpose: 'Lembrar sua escolha de cookies.', vendor: 'Grow-X', duration: '12 meses' },
    ],
  },
  {
    cat: 'Analíticos',
    required: false,
    items: [
      { name: '_ga / _ga_*', purpose: 'Análise de tráfego e funil.', vendor: 'Google Analytics 4', duration: '14 meses' },
      { name: '_clck / _clsk', purpose: 'Heatmap e session replay.', vendor: 'Microsoft Clarity', duration: '12 meses' },
    ],
  },
  {
    cat: 'Marketing',
    required: false,
    items: [
      { name: '_fbp', purpose: 'Atribuição de campanhas Meta.', vendor: 'Meta Pixel', duration: '90 dias' },
      { name: 'li_at / lidc', purpose: 'Atribuição de campanhas LinkedIn.', vendor: 'LinkedIn Insight', duration: '180 dias' },
    ],
  },
];

export default function CookiesPage() {
  const [choice, setChoice] = useState(null);
  useEffect(() => {
    if (typeof window !== 'undefined') setChoice(localStorage.getItem('growx-cookie-consent'));
  }, []);

  const decide = (v) => {
    localStorage.setItem('growx-cookie-consent', v);
    setChoice(v);
  };

  return (
    <>
      <SEO
        title="Cookies · Grow-X"
        description="Quais cookies a Grow-X usa, pra quê, e como gerenciar suas preferências."
        path="/cookies"
      />

      <section className="relative isolate overflow-hidden pt-16 pb-16 sm:pt-20 lg:pt-28">
        <Aurora intensity="sm" />
        <GridPattern fine mask="bottom" />
        <Container narrow>
          <Reveal>
            <Eyebrow icon={Cookie}>Cookies</Eyebrow>
            <h1 className="mt-6 text-display-xl text-foreground">
              Política de <span className="text-emerald-glow">cookies.</span>
            </h1>
            <p className="mt-6 text-base leading-relaxed text-muted-foreground sm:text-lg">
              Listamos abaixo cada cookie usado, com finalidade, duração e fornecedor. Sua escolha é respeitada.
            </p>
          </Reveal>
        </Container>
      </section>

      <section className="section-y-tight">
        <Container narrow>
          <Reveal>
            <GlassCard variant="emerald" className="p-7 sm:p-9">
              <h2 className="font-display text-xl font-bold text-foreground sm:text-2xl">Sua preferência atual</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {choice === 'accepted' && 'Você aceitou todos os cookies. Pode mudar a qualquer momento.'}
                {choice === 'declined' && 'Você recusou cookies não-essenciais. Apenas cookies de funcionamento são usados.'}
                {!choice && 'Ainda não escolhido. Decida abaixo (ou pelo banner que aparece na 1ª visita).'}
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  onClick={() => decide('accepted')}
                  className={'btn-primary ' + (choice === 'accepted' ? 'opacity-90' : '')}
                >
                  <Check className="size-4" />
                  Aceitar todos
                </button>
                <button
                  onClick={() => decide('declined')}
                  className={'btn-ghost ' + (choice === 'declined' ? 'opacity-90' : '')}
                >
                  <X className="size-4" />
                  Apenas essenciais
                </button>
              </div>
            </GlassCard>
          </Reveal>
        </Container>
      </section>

      <section className="section-y-tight">
        <Container narrow>
          <div className="space-y-6">
            {COOKIES.map((g, i) => (
              <Reveal key={g.cat} delay={i * 0.06}>
                <GlassCard variant="surface" className="overflow-hidden">
                  <div className="flex items-center gap-3 border-b border-foreground/[0.06] px-6 py-4 sm:px-8">
                    <h3 className="font-display text-lg font-semibold text-foreground sm:text-xl">{g.cat}</h3>
                    <span className={
                      'rounded-full px-2.5 py-0.5 text-[10px] font-mono uppercase tracking-wider ' +
                      (g.required
                        ? 'bg-emerald/15 text-emerald-glow ring-hairline'
                        : 'bg-foreground/[0.06] text-muted-foreground ring-hairline')
                    }>
                      {g.required ? 'Sempre ativos' : 'Opcionais (consentimento)'}
                    </span>
                  </div>
                  <ul className="divide-y divide-foreground/[0.04]">
                    {g.items.map((c) => (
                      <li key={c.name} className="grid gap-2 px-6 py-4 text-sm sm:grid-cols-12 sm:gap-6 sm:px-8">
                        <div className="font-mono text-xs text-emerald-glow sm:col-span-3">{c.name}</div>
                        <div className="text-foreground/85 sm:col-span-5">{c.purpose}</div>
                        <div className="text-muted-foreground sm:col-span-2">{c.vendor}</div>
                        <div className="text-muted-foreground sm:col-span-2">{c.duration}</div>
                      </li>
                    ))}
                  </ul>
                </GlassCard>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>
    </>
  );
}
