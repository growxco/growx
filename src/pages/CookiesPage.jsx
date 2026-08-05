import { useEffect, useState } from 'react';
import { Cookie, Check, X } from 'lucide-react';
import { SEO, Container, Eyebrow, Reveal, GlassCard, Aurora, GridPattern } from '@/components/visual';
import {
  COOKIE_CONSENT,
  getCookieConsent,
  setCookieConsent,
  subscribeCookieConsent,
} from '@/lib/consent';

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
      { name: 'Web Analytics', purpose: 'Métricas agregadas de navegação.', vendor: 'Vercel', duration: 'Sem cookie próprio' },
      { name: 'Speed Insights', purpose: 'Medição de desempenho das páginas.', vendor: 'Vercel', duration: 'Sem cookie próprio' },
    ],
  },
  {
    cat: 'Marketing',
    required: false,
    items: [
      { name: '_fbp', purpose: 'Atribuição de campanhas Meta.', vendor: 'Meta Pixel', duration: '90 dias' },
      { name: 'li_gc / lidc / _li_id', purpose: 'Preferência e atribuição de campanhas LinkedIn.', vendor: 'LinkedIn Insight', duration: 'Até 180 dias' },
    ],
  },
];

export default function CookiesPage() {
  const [choice, setChoice] = useState(() => getCookieConsent());

  useEffect(() => {
    setChoice(getCookieConsent());
    return subscribeCookieConsent(setChoice);
  }, []);

  const decide = (v) => {
    setCookieConsent(v);
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
                {choice === COOKIE_CONSENT.ACCEPTED && 'Você aceitou cookies opcionais de análise e marketing. Pode mudar a qualquer momento.'}
                {choice === COOKIE_CONSENT.DECLINED && 'Você recusou cookies opcionais. Apenas recursos essenciais permanecem ativos.'}
                {!choice && 'Ainda não escolhido. Decida abaixo (ou pelo banner que aparece na 1ª visita).'}
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => decide(COOKIE_CONSENT.ACCEPTED)}
                  aria-pressed={choice === COOKIE_CONSENT.ACCEPTED}
                  className={'btn-primary ' + (choice === COOKIE_CONSENT.ACCEPTED ? 'opacity-90' : '')}
                >
                  <Check className="size-4" />
                  Aceitar opcionais
                </button>
                <button
                  type="button"
                  onClick={() => decide(COOKIE_CONSENT.DECLINED)}
                  aria-pressed={choice === COOKIE_CONSENT.DECLINED}
                  className={'btn-ghost ' + (choice === COOKIE_CONSENT.DECLINED ? 'opacity-90' : '')}
                >
                  <X className="size-4" />
                  Apenas essenciais
                </button>
              </div>
            </GlassCard>
          </Reveal>
        </Container>
      </section>

      <section className="section-y-tight pt-0">
        <Container narrow>
          <Reveal>
            <GlassCard variant="surface" className="p-7 sm:p-9">
              <h2 className="font-display text-xl font-bold text-foreground sm:text-2xl">Serviço funcional sem cookie opcional</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                No formulário da pré-venda, após você informar os oito dígitos, o CEP é enviado ao ViaCEP para
                preencher cidade e estado. Nome, CPF, e-mail e endereço não são enviados nessa consulta. Essa busca
                só acontece durante o preenchimento e não ativa cookies de análise ou marketing.
              </p>
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                Ao escolher “Apenas essenciais”, removemos em melhor esforço os identificadores opcionais acessíveis
                no domínio da Grow-X e recarregamos a página para retirar os scripts já carregados. Cookies HttpOnly
                ou gravados por domínios terceiros seguem o prazo do respectivo fornecedor.
              </p>
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
