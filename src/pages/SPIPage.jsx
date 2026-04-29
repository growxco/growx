import { Factory, BarChart3, Cog, AlertTriangle, Shield, Clock, Zap } from 'lucide-react';
import { SEO } from '@/components/visual';
import { PageHero, FeatureGrid, SplitFeature, MetricStrip, UseCases, FinalCTA, LiveTicker } from '@/components/sections';
import spiHero from '../assets/spi-hero-v2.webp';
import spiDashboard from '../assets/spi-dashboard-industrial.webp';

const FEATURES = [
  { icon: BarChart3, title: 'Dashboard operacional', description: 'Status logístico e indicadores de recebimento em uma só tela.' },
  { icon: Cog, title: 'Automação de agendamentos', description: 'Fluxo digital com notificações e confirmação por etapa.' },
  { icon: AlertTriangle, title: 'Alertas antecipados', description: 'Problemas detectados antes de virar parada de fábrica.' },
  { icon: Shield, title: 'Rastreabilidade de qualidade', description: 'Documentos e laudos amarrados a carga, lote e fornecedor.' },
  { icon: Clock, title: 'Tempo de resposta', description: 'Decisão em minutos com dados antecipados da produção.' },
  { icon: Zap, title: 'Integração com ERP', description: 'Exportação ou conexão via API com qualquer sistema.' },
];

const METRICS = [
  { value: 'Recebimento', label: 'Digital, sem caminhão parado' },
  { value: 'Qualidade', label: 'Trilha completa de documentos' },
  { value: 'Logística', label: 'Slot booking e prioridades' },
  { value: 'ERP-ready', label: 'Conexão por API ou arquivo' },
];

export default function SPIPage() {
  return (
    <>
      <SEO
        title="SPI — Plataforma agroindustrial de recebimento e governança"
        description="Recebimento agrícola digital, rastreabilidade ponta-a-ponta e governança pra indústria. Reduza paradas e ganhe controle."
        path="/solucoes/spi"
      />

      <PageHero
        eyebrow="Solução · Indústria"
        eyebrowIcon={Factory}
        title={<>Indústria <span className="text-emerald-glow">conectada</span> à originação.</>}
        intro="Sistema completo que automatiza o recebimento de cargas agrícolas, assegura rastreabilidade ponta-a-ponta e eleva o controle de qualidade com monitoramento em tempo real."
        primaryCta={{ label: 'Solicitar demonstração', href: '/contato' }}
        secondaryCta={{ label: 'Ver Supply-X', href: '/solucoes/supply-x' }}
        image={spiHero}
        imageAlt="SPI plataforma industrial"
      />

      <LiveTicker />
      <MetricStrip items={METRICS} />

      <UseCases
        eyebrow="Benefícios potenciais"
        title="Indicadores que impactam o bottom line."
        intro="Quatro frentes onde a SPI reduz custo, aumenta previsibilidade e aperta a malha operacional."
        items={[
          { title: 'Reduza insumos com inteligência', description: 'Planeje com dados reais e elimine desperdícios operacionais de forma progressiva.', points: ['Histórico por lote', 'Decisão logística com dado', 'Menos retrabalho'] },
          { title: 'Logística em tempo real', description: 'Mais fluidez no fluxo entre campo, transporte, armazenagem e indústria.', points: ['Agendamento digital', 'Antecipação de falhas', 'API para sistemas'] },
          { title: 'Estabilidade operacional', description: 'Detecte atrasos e riscos antes que impactem o processo industrial.', points: ['Notificações em tempo real', 'Comunicação proativa', 'Relatórios automáticos'] },
        ]}
      />

      <FeatureGrid
        eyebrow="Recursos avançados"
        title="Tecnologia industrial de ponta."
        intro="Stack desenhado pra cooperar com seus sistemas, não disputar com eles."
        items={FEATURES}
      />

      <SplitFeature
        eyebrow="Dashboard industrial"
        title="Métricas, alertas e controles num só lugar."
        intro="Interface centralizada com indicadores em tempo real, alertas inteligentes e controles operacionais — feita pra time técnico."
        bullets={[
          'Métricas de produção ao vivo',
          'Alertas preventivos e preditivos',
          'Controles operacionais centralizados',
          'Relatórios automatizados',
        ]}
        cta={{ label: 'Ver demo do dashboard', href: '/contato' }}
        image={spiDashboard}
        imageAlt="Dashboard SPI"
      />

      <UseCases
        eyebrow="Casos de uso"
        title="Soluções por segmento."
        intro="Diferentes fases da cadeia, mesmo padrão de excelência operacional."
        items={[
          { title: 'Agroindústrias', description: 'Recebimento de cargas e comunicação entre armazenagem e processamento.', points: ['Controle de agendamentos', 'Rastreamento de carregamentos', 'Qualidade conectada'] },
          { title: 'Produtores integrados', description: 'Digitalização da comunicação campo↔indústria com planejamento ao vivo.', points: ['Informações antecipadas', 'Menos conflito logístico', 'Planejamento seguro'] },
          { title: 'Centros de distribuição', description: 'Sincronização com fábricas e transportadoras, status em tempo real.', points: ['Monitoramento de entrega', 'Conferência por carga', 'Redução de incertezas'] },
        ]}
      />

      <FinalCTA />
    </>
  );
}
