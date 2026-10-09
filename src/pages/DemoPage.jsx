import { Building2, MessageCircle, ShieldCheck, Clock, Users, Factory } from 'lucide-react';
import { SEO, Container, Eyebrow, Reveal, GlassCard, Aurora, GridPattern, StatusDot, LeadForm } from '@/components/visual';
import { CONTACT, whatsappLink } from '@/lib/crm';
import { analytics } from '@/lib/analytics';
import { CORPORATE_CONTACT_PATH } from '@/lib/portalLinks';

const FIELDS = [
 { name: 'name', label: 'Nome', required: true },
 { name: 'email', label: 'E-mail para contato', type: 'email', required: true },
 { name: 'company', label: 'Empresa (opcional)' },
 { name: 'phone', label: 'WhatsApp (opcional)', type: 'tel' },
 { name: 'message', label: 'Sua principal necessidade (opcional)', type: 'textarea', placeholder: 'Se desejar, conte o que precisa organizar.' },
];

const PROOFS = [
  { icon: Clock, t: 'Contato qualificado', d: 'Primeiro entendemos a operação.' },
  { icon: Factory, t: 'Diagnóstico real', d: 'Mostramos onde a Grow-X encaixa na sua operação.' },
  { icon: Users, t: 'Time fundador', d: 'Quem fala é o time que constrói o produto.' },
  { icon: ShieldCheck, t: 'Acesso empresarial', d: 'SPI entra com escopo, integração e governança.' },
];

export default function DemoPage() {
  const onWhatsApp = () => {
    analytics.ctaWhatsApp(CORPORATE_CONTACT_PATH, 'spi-enterprise');
    window.open(whatsappLink('Olá! Quero falar com a Grow-X sobre SPI para empresa.'), '_blank', 'noopener');
  };

  return (
    <>
      <SEO
        title="Contato corporativo SPI · Grow-X"
        description="Contato empresarial para SPI/Supply-X. Recebimento, qualidade, logística, ERP, rastreabilidade e governança industrial."
        path={CORPORATE_CONTACT_PATH}
      />

      <section className="relative isolate overflow-hidden pt-16 pb-16 sm:pt-20 lg:pt-28">
        <Aurora intensity="md" />
        <GridPattern fine mask="bottom" />
        <Container>
          <div className="grid items-start gap-12 lg:grid-cols-12 lg:gap-14">
            <div className="lg:col-span-6">
              <Reveal>
                <Eyebrow icon={Building2}>Contato corporativo SPI</Eyebrow>
              </Reveal>
              <Reveal delay={0.06}>
                <h1 className="mt-6 text-display-xl text-foreground">
                  Empresa entra por <span className="text-emerald-glow">diagnóstico real.</span>
                </h1>
              </Reveal>
              <Reveal delay={0.14}>
                <p className="mt-6 text-lg leading-relaxed text-muted-foreground sm:text-xl">
                  SPI/Supply-X não é assinatura aberta. A Grow-X entende seu fluxo, integrações, volume e risco antes de liberar acesso corporativo.
                </p>
              </Reveal>
              <Reveal delay={0.22}>
                <div className="mt-8">
                  <StatusDot label="Time disponível esta semana" />
                </div>
              </Reveal>

              <div className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {PROOFS.map((p, i) => {
                  const Icon = p.icon;
                  return (
                    <Reveal key={p.t} delay={0.3 + i * 0.05}>
                      <GlassCard variant="surface" className="flex items-start gap-3 p-4">
                        <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald/15 text-emerald-glow ring-hairline">
                          <Icon className="size-4" />
                        </span>
                        <div>
                          <div className="text-sm font-semibold text-foreground">{p.t}</div>
                          <div className="mt-0.5 text-xs leading-snug text-muted-foreground">{p.d}</div>
                        </div>
                      </GlassCard>
                    </Reveal>
                  );
                })}
              </div>

              <div className="mt-10">
                <button onClick={onWhatsApp} className="btn-ghost">
                  <MessageCircle className="size-4" />
                  Prefiro WhatsApp · {CONTACT.phone}
                </button>
              </div>
            </div>

            <Reveal delay={0.18} className="lg:col-span-6">
              <GlassCard variant="strong" className="p-7 sm:p-9">
                <h2 className="font-display text-xl font-bold text-foreground sm:text-2xl">Conte sua operação.</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Para começar, precisamos apenas de nome e e-mail. O contexto da operação pode ser combinado na conversa.
                </p>
                <div className="mt-6">
                  <LeadForm
                    form="spi-enterprise-contact"
                    segment="industrial"
                    fields={FIELDS}
                    extra={{ subject: 'SPI' }}
                    source={new URLSearchParams(window.location.search).get('origem') === 'supplyx' ? 'supplyx' : 'growx'}
                    submitLabel="Solicitar contato corporativo"
                    successTitle="Contato corporativo recebido."
                    successText="O canal recebeu sua solicitação. O time combina o próximo passo para SPI/Supply-X."
                  />
                </div>
              </GlassCard>
            </Reveal>
          </div>
        </Container>
      </section>
    </>
  );
}
