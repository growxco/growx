import { Handshake, Code, Truck, Users, Award } from 'lucide-react';
import { SEO, Container, Eyebrow, Reveal, GlassCard, Aurora, GridPattern, LeadForm } from '@/components/visual';
import { FeatureGrid, FinalCTA } from '@/components/sections';

const TIPOS = [
  { icon: Code, title: 'Integradores e consultorias agtech', desc: 'Recomende e implemente Grow-X em clientes B2B. Comissão recorrente + treinamento técnico.' },
  { icon: Truck, title: 'Revendedores hardware', desc: 'Distribua Estação, Módulo e Estufa em sua região. Margem por unidade + suporte centralizado.' },
  { icon: Users, title: 'Embaixadores cultivo', desc: 'Cultivadores referência: hardware grátis em troca de diário público + 1 conteúdo/mês.' },
  { icon: Award, title: 'Co-marketing', desc: 'Parceria com cooperativas, associações, mídia setorial. Conteúdo conjunto e eventos.' },
];

const FIELDS = [
  { name: 'name', label: 'Nome completo', required: true },
  { name: 'email', label: 'E-mail corporativo', type: 'email', required: true },
  { name: 'phone', label: 'WhatsApp', type: 'tel', required: true },
  { name: 'company', label: 'Empresa / projeto', required: true },
  {
    name: 'partnerType',
    label: 'Tipo de parceria',
    type: 'select',
    required: true,
    options: [
      { value: 'integrator', label: 'Integrador / consultoria' },
      { value: 'reseller', label: 'Revendedor hardware' },
      { value: 'ambassador', label: 'Embaixador cultivo' },
      { value: 'comarketing', label: 'Co-marketing / mídia' },
      { value: 'other', label: 'Outro' },
    ],
  },
  { name: 'reach', label: 'Sua audiência ou base de clientes', placeholder: 'Ex.: 30 cooperativas atendidas, 12 mil seguidores, 200 produtores' },
  { name: 'message', label: 'Por que faz sentido?', type: 'textarea', placeholder: 'Conte sua proposta em 2 frases' },
];

export default function ParceirosPage() {
  return (
    <>
      <SEO
        title="Parceiros · Grow-X"
        description="Programa de parceiros Grow-X: integradores, revendedores, embaixadores e co-marketing. Construindo a stack agro brasileira juntos."
        path="/parceiros"
      />

      <section className="relative isolate overflow-hidden pt-16 pb-16 sm:pt-20 lg:pt-28">
        <Aurora intensity="md" />
        <GridPattern fine mask="bottom" />
        <Container>
          <Reveal className="max-w-3xl">
            <Eyebrow icon={Handshake}>Parceiros</Eyebrow>
            <h1 className="mt-6 text-display-xl text-foreground">
              Construímos a stack agro <span className="text-emerald-glow">juntos.</span>
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-muted-foreground sm:text-xl">
              A Grow-X cresce melhor com integradores, revendedores e cultivadores referência. Aqui é onde quem
              opera Grow-X de fora do nosso time vira parte do ecossistema.
            </p>
          </Reveal>
        </Container>
      </section>

      <FeatureGrid
        eyebrow="Tipos de parceria"
        title="Quatro caminhos. Mesma stack."
        items={TIPOS}
        columns={4}
      />

      <section className="section-y">
        <Container narrow>
          <Reveal>
            <GlassCard variant="strong" className="p-7 sm:p-10">
              <Eyebrow>Aplicação</Eyebrow>
              <h2 className="mt-4 text-display-md text-foreground">Vamos conversar.</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Nosso time avalia cada aplicação manualmente. Resposta em até 5 dias úteis.
              </p>
              <div className="mt-7">
                <LeadForm
                  form="partner-application"
                  segment="partner"
                  fields={FIELDS}
                  submitLabel="Enviar aplicação"
                  successTitle="Aplicação recebida."
                  successText="Em até 5 dias úteis o time de parcerias retorna pra agendar uma conversa."
                />
              </div>
            </GlassCard>
          </Reveal>
        </Container>
      </section>

      <FinalCTA />
    </>
  );
}
