import { Calendar, MessageCircle, ShieldCheck, Clock, Users, Factory } from 'lucide-react';
import { SEO, Container, Eyebrow, Reveal, GlassCard, Aurora, GridPattern, StatusDot, LeadForm } from '@/components/visual';
import { CONTACT, whatsappLink } from '@/lib/crm';
import { analytics } from '@/lib/analytics';

const FIELDS = [
  { name: 'name', label: 'Nome completo', required: true, placeholder: 'Como você se chama?' },
  { name: 'email', label: 'E-mail corporativo', type: 'email', required: true, placeholder: 'voce@empresa.com.br' },
  { name: 'phone', label: 'WhatsApp', type: 'tel', required: true, placeholder: '(41) 99999-9999' },
  { name: 'company', label: 'Empresa', required: true, placeholder: 'Razão social ou nome' },
  {
    name: 'segment',
    label: 'Qual segmento?',
    type: 'select',
    required: true,
    options: [
      { value: 'industrial', label: 'Indústria agroalimentar' },
      { value: 'cooperativa', label: 'Cooperativa / cadeia integrada' },
      { value: 'producer', label: 'Produtor rural (médio/grande)' },
      { value: 'cultivo', label: 'Cultivo controlado / cannabis' },
      { value: 'integrator', label: 'Integrador / consultoria agtech' },
      { value: 'other', label: 'Outro' },
    ],
  },
  {
    name: 'companySize',
    label: 'Porte da operação',
    type: 'select',
    required: true,
    options: [
      { value: '1-10', label: 'Até 10 pessoas' },
      { value: '11-50', label: '11–50 pessoas' },
      { value: '51-200', label: '51–200 pessoas' },
      { value: '201-1000', label: '201–1.000 pessoas' },
      { value: '1000+', label: 'Mais de 1.000' },
    ],
  },
  {
    name: 'role',
    label: 'Seu papel',
    required: true,
    placeholder: 'Ex.: Diretor industrial, COO, gerente de operações',
  },
  {
    name: 'urgency',
    label: 'Quando precisa operar?',
    type: 'select',
    required: true,
    options: [
      { value: 'agora', label: 'Agora (já tenho dor ativa)' },
      { value: '30d', label: 'Próximos 30 dias' },
      { value: '90d', label: 'Próximos 90 dias' },
      { value: 'sem-prazo', label: 'Estou explorando' },
    ],
  },
  { name: 'message', label: 'Conte sua dor em uma frase', type: 'textarea', placeholder: 'Ex.: Recebimento na balança vive lotando, ERP desconectado…' },
];

const PROOFS = [
  { icon: Clock, t: '30 minutos', d: 'Direto ao ponto. Sem deck institucional.' },
  { icon: Factory, t: 'Diagnóstico real', d: 'Mostramos onde a Grow-X encaixa na sua operação.' },
  { icon: Users, t: 'Time fundador', d: 'Quem fala é o time que constrói o produto.' },
  { icon: ShieldCheck, t: 'Sem compromisso', d: 'Você sai com mockup do seu cenário, decide depois.' },
];

export default function DemoPage() {
  const onWhatsApp = () => {
    analytics.ctaWhatsApp('/demo', 'demo');
    window.open(whatsappLink('Olá! Quero agendar uma demo Grow-X.'), '_blank', 'noopener');
  };

  return (
    <>
      <SEO
        title="Agendar demo · Grow-X"
        description="30 minutos com o time fundador. Mostramos onde a Grow-X encaixa na sua operação — com mockup do seu cenário."
        path="/demo"
      />

      <section className="relative isolate overflow-hidden pt-16 pb-16 sm:pt-20 lg:pt-28">
        <Aurora intensity="md" />
        <GridPattern fine mask="bottom" />
        <Container>
          <div className="grid items-start gap-12 lg:grid-cols-12 lg:gap-14">
            <div className="lg:col-span-6">
              <Reveal>
                <Eyebrow icon={Calendar}>Agendar demo</Eyebrow>
              </Reveal>
              <Reveal delay={0.06}>
                <h1 className="mt-6 text-display-xl text-foreground">
                  30 minutos. <span className="text-emerald-glow">Direto ao ponto.</span>
                </h1>
              </Reveal>
              <Reveal delay={0.14}>
                <p className="mt-6 text-lg leading-relaxed text-muted-foreground sm:text-xl">
                  A gente entende sua operação, mostra onde a Grow-X encaixa e sai com um mockup do seu cenário.
                  Sem deck institucional, sem promessa vazia.
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
                  O time prepara a demo com base no que você responder.
                </p>
                <div className="mt-6">
                  <LeadForm
                    form="demo-b2b"
                    segment="industrial"
                    fields={FIELDS}
                    submitLabel="Agendar demo"
                    successTitle="Pedido de demo recebido."
                    successText="Em até 1 dia útil, nosso time entra em contato pra fechar a agenda."
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
