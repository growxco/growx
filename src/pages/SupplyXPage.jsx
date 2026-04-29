import { Globe, BarChart3, Shield, Zap } from 'lucide-react';
import { SEO } from '@/components/visual';
import {
  PageHero, FeatureGrid, SplitFeature, MetricStrip, UseCases, FinalCTA, LiveTicker,
} from '@/components/sections';
import supplyXHero from '../assets/supply-x-hero-v2.webp';
import spiBanner from '../assets/supply-x-spi-v2.webp';
import sppBanner from '../assets/supply-x-spp-v2.webp';

const FEATURES = [
  { icon: Globe, title: 'Plataforma unificada', description: 'Indústria e produtor numa só camada de dados auditável.' },
  { icon: BarChart3, title: 'Analytics em tempo real', description: 'Dashboards técnicos com leitura imediata da operação.' },
  { icon: Shield, title: 'Rastreabilidade end-to-end', description: 'Cada lote, cada talhão, cada carga com trilha digital própria.' },
  { icon: Zap, title: 'Automação inteligente', description: 'Eventos críticos disparam ações sem intervenção manual.' },
];

const METRICS = [
  { value: 'SPI + SPP', label: 'Módulos integrados nativamente' },
  { value: 'API-first', label: 'Conexão com ERP, banco e logística' },
  { value: 'Real-time', label: 'Sincronização campo↔indústria' },
  { value: 'Auditável', label: 'Trilha de dados imutável por contrato' },
];

export default function SupplyXPage() {
  return (
    <>
      <SEO
        title="Supply-X — Plataforma de orquestração da cadeia agro"
        description="Supply-X conecta indústria (SPI) e produtor (SPP) numa cadeia rastreável, em tempo real, com governança auditável."
        path="/solucoes/supply-x"
      />

      <PageHero
        eyebrow="Plataforma · Supply-X"
        eyebrowIcon={Globe}
        title={<>A camada que <span className="text-emerald-glow">orquestra</span> indústria e campo.</>}
        intro="Plataforma modular que une SPI e SPP numa única operação rastreável — do insumo ao produto final."
        primaryCta={{ label: 'Solicitar demonstração', href: '/contato' }}
        secondaryCta={{ label: 'Falar com especialista', href: '/contato' }}
        image={supplyXHero}
        imageAlt="Supply-X plataforma"
        status="Plataforma ativa em produção"
      />

      <LiveTicker />
      <MetricStrip items={METRICS} />

      <SplitFeature
        eyebrow="SPI · Indústria"
        title="Indústria conectada à originação."
        intro="Recebimento agrícola digital, integração ERP e governança do chão de fábrica — tudo numa leitura única."
        bullets={[
          'Agendamento de cargas com confirmação automática',
          'Rastreabilidade por lote, fornecedor e laudo',
          'Alertas antecipados de falhas operacionais',
          'Exportação direta pra ERP via API',
        ]}
        cta={{ label: 'Ver SPI', href: '/solucoes/spi' }}
        image={spiBanner}
        imageAlt="Recebimento agroindustrial Supply-X com dashboard de logística em tempo real"
      />

      <SplitFeature
        eyebrow="SPP · Produtores"
        title="O produtor decide com dado, não com chute."
        intro="App agronômico com cálculo de irrigação por Kc, integração climática e planejamento por fase de cultura."
        bullets={[
          'Cálculo automático da lâmina de irrigação',
          'Apoio agronômico baseado em solo + clima',
          'Diário de campo digital',
          'Integração com Supply-X e SPI',
        ]}
        cta={{ label: 'Ver SPP', href: '/solucoes/spp' }}
        image={sppBanner}
        imageAlt="Produtor segurando smartphone com app SPP no campo de soja ao pôr do sol"
        reversed
      />

      <FeatureGrid
        eyebrow="Recursos da plataforma"
        title="Tecnologia que não se vê — só se sente na operação."
        intro="Stack moderno, desenhado pra rede precária, dados confiáveis e times técnicos."
        items={FEATURES}
        columns={4}
      />

      <UseCases
        eyebrow="Integração end-to-end"
        title="Tudo o que a integração libera."
        intro="A força do Supply-X está na junção. Veja o que muda na sua operação."
        items={[
          { title: 'Comunicação direta', description: 'Produtor, transportadora e indústria falam pela mesma plataforma — sem ruído.', points: ['Mensageria por carga', 'Notificações cross-equipe'] },
          { title: 'Originação rastreável', description: 'Cada carga carrega seu próprio dossiê digital, do talhão até a balança.', points: ['Documentos por lote', 'Histórico imutável'] },
          { title: 'Logística sem gargalo', description: 'Janelas de descarga, agendamentos e prioridades resolvidos via plataforma.', points: ['Slot booking', 'Alertas preditivos'] },
        ]}
      />

      <FinalCTA />
    </>
  );
}
