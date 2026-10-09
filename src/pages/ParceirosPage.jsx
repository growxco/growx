import { Handshake, Code, Truck, Users, Award } from 'lucide-react';
import { SEO, Container, Eyebrow, Reveal, GlassCard, Aurora, GridPattern, LeadForm } from '@/components/visual';
import { FeatureGrid, FinalCTA } from '@/components/sections';
import { Journey, JourneyCards } from '@/components/sections/MarketingJourney';

const TIPOS = [
  { icon: Code, title: 'Integradores e consultorias agtech', desc: 'Avalie o escopo de integração, implantação e suporte. Responsabilidades e condições dependem da proposta.' },
  { icon: Truck, title: 'Revendedores hardware', desc: 'Para growshops e revendedores: conheça o módulo, o GXP e a composição da oferta antes de definir o projeto.' },
  { icon: Users, title: 'Embaixadores cultivo', desc: 'Converse sobre demonstração e colaboração. Equipamentos, conteúdo e condições são definidos na proposta.' },
  { icon: Award, title: 'Co-marketing', desc: 'Parceria com cooperativas, associações, mídia setorial. Ações e responsabilidades são definidas em conjunto.' },
];

const FIELDS = [
  { name: 'name', label: 'Nome completo', required: true },
  { name: 'email', label: 'E-mail corporativo', type: 'email', required: true },
  { name: 'phone', label: 'WhatsApp (opcional)', type: 'tel' },
  { name: 'company', label: 'Loja / empresa / projeto (opcional)' },
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
              GXP e Módulo para sua loja: <span className="text-emerald-glow">vamos conversar.</span>
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-muted-foreground sm:text-xl">
              A Grow-X cresce melhor com integradores, revendedores e cultivadores referência. Aqui é onde quem
              opera Grow-X de fora do nosso time vira parte do ecossistema.
            </p>
          </Reveal>
        </Container>
      </section>

      <Journey eyebrow="Growshops e parceiros" title="Composição clara antes de vender." intro="Módulo: referência de R$ 5.000 no varejo e R$ 3.500 no atacado. Referências comerciais dependem da proposta; não constituem oferta de compra nem garantia de margem, giro ou exclusividade."><JourneyCards items={[{title:'Conhecer e demonstrar',text:'Entenda Jardim, Diário e informações dos equipamentos no GXP. Demonstração web e comandos físicos em validação são etapas diferentes.',to:'/solucoes/growx-app',label:'Conhecer o GXP'},{title:'Definir a composição',text:'Kit, acessórios externos, compatibilidade e instalação precisam estar descritos antes da contratação.',to:'/produtos/modulo-sem-fio',label:'Avaliar o módulo'},{title:'Combinar responsabilidades',text:'Defina quem demonstra, instala, orienta o cliente e responde pelo suporte. Condições ficam registradas na proposta.'}]}/></Journey>
      <Journey id="catalogo-parceiros" eyebrow="Apresentação para parceiros" title="GXP e Módulo no seu growshop." intro="Catálogo visual para lojas e distribuidores — 12 páginas — PDF 2,96 MiB. Cenas ilustrativas, telas demonstradas e referências comerciais; composição final, disponibilidade e responsabilidades são confirmadas na proposta.">
        <div className="flex flex-wrap gap-3"><a href="/catalogos/gxp-parceiros-visual.pdf" target="_blank" rel="noopener noreferrer" className="btn-primary">Abrir catálogo de parceiros</a><a href="/catalogos/gxp-parceiros-visual.pdf" download="GXP e Módulo - Parceiros.pdf" className="btn-ghost">Baixar catálogo de parceiros</a></div>
        <p className="mt-5 text-sm leading-relaxed text-muted-foreground">Extra: catálogo editorial GXP e Módulo — 8 páginas — PDF 1,93 MiB. Arquivo editorial anterior; as especificações e condições atuais são confirmadas na proposta.</p>
        <div className="mt-3 flex flex-wrap gap-3"><a href="/catalogos/gxp-editorial-a4.pdf" target="_blank" rel="noopener noreferrer" className="btn-ghost">Abrir editorial extra</a><a href="/catalogos/gxp-editorial-a4.pdf" download="GXP e Módulo - Editorial extra.pdf" className="btn-ghost">Baixar editorial extra</a></div>
      </Journey>
      <FeatureGrid
        eyebrow="Tipos de parceria"
        title="Quatro caminhos. Mesma stack."
        items={TIPOS.map(item => ({ ...item, description: item.desc }))}
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

