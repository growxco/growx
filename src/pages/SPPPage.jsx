import {
  Tractor, Gauge, NotebookPen,
  FlaskConical, Leaf, Smartphone, Users,
} from 'lucide-react';
import { SEO } from '@/components/visual';
import { PageHero, FeatureGrid, SplitFeature, MetricStrip, UseCases, Testimonials, FinalCTA, LiveTicker } from '@/components/sections';
import sppHero from '../assets/spp-hero-v2.webp';
import sppDashboard from '../assets/spp-dashboard-irrigation.webp';

const FEATURES = [
  { icon: Gauge, title: 'Controle automatizado', description: 'Irrigação inteligente com base nos dados do campo.' },
  { icon: NotebookPen, title: 'Diário de campo', description: 'Registro digital de cada atividade na lavoura.' },
  { icon: FlaskConical, title: 'Análise de solo', description: 'Integração com laudos para correção e adubação.' },
  { icon: Leaf, title: 'Análise foliar', description: 'Acompanhamento nutricional por fase da cultura.' },
  { icon: Users, title: 'Apoio técnico', description: 'Suporte agronômico do time Grow-X.' },
  { icon: Smartphone, title: 'App mobile', description: 'Lavoura na palma da mão — em qualquer lugar.' },
];

const METRICS = [
  { value: 'Kc-driven', label: 'Cálculo de irrigação por coeficiente de cultura' },
  { value: 'Clima local', label: 'Integração com estações + previsão' },
  { value: 'Mobile-first', label: 'Decisão direto da bota' },
  { value: 'Suporte BR', label: 'Time agronômico em português' },
];

const TESTS = [
  { quote: 'Antes eu fazia tudo no caderno. Depois do SPP, ganhei tempo e parei de desperdiçar água. Agora sei o que fazer e quando.', name: 'Alexandre de Castro', role: 'Produtor de batata', location: 'Contenda/PR' },
  { quote: 'Com o módulo de gestão, percebi quanto gastava com manutenção. Hoje decido com dado quando trocar ou consertar.', name: 'Emilio Dzierwa', role: 'Produtor rural', location: 'Palmeira/PR' },
];

export default function SPPPage() {
  return (
    <>
      <SEO
        title="SPP — App agronômico que organiza o produtor real"
        description="Cálculo de irrigação por Kc, diário de campo, análise de solo e apoio técnico. O app que transforma decisão agronômica em rotina."
        path="/solucoes/spp"
      />

      <PageHero
        eyebrow="Solução · Produtores"
        eyebrowIcon={Tractor}
        title={<>O app que <span className="text-emerald-glow">organiza</span> o produtor real.</>}
        intro="Plataforma agronômica que cobre todas as etapas do cultivo — do planejamento à colheita — com cálculo técnico e linguagem do campo."
        primaryCta={{ label: 'Solicitar demonstração', href: '/contato' }}
        secondaryCta={{ label: 'Falar com especialista', href: '/contato' }}
        image={sppHero}
        imageAlt="SPP App rural"
      />

      <LiveTicker />
      <MetricStrip items={METRICS} />

      <UseCases
        eyebrow="Como o SPP salva o produtor"
        title="Quatro pilares de impacto agronômico."
        intro="Cada pilar traduz um problema diário em decisão calculada, não em achismo."
        items={[
          { title: 'Economia de água', description: 'Irrigação orientada por sensores e clima — sem desperdício.', points: ['Decisão por dado real', 'Sensores de umidade', 'Evita excesso'] },
          { title: 'Cálculo de irrigação', description: 'Algoritmo Kc + clima ajusta lâmina por fase e cultura.', points: ['Coeficiente de cultura', 'Integração climática', 'Recomendação por estágio'] },
          { title: 'Decisão ágil', description: 'Recomendações e alertas direto no celular, em segundos.', points: ['Interface intuitiva', 'Alertas configuráveis', 'Tempo real'] },
        ]}
      />

      <FeatureGrid
        eyebrow="Recursos completos"
        title="Tecnologia rural de ponta — feita pra rotina."
        items={FEATURES}
      />

      <SplitFeature
        eyebrow="Dashboard rural"
        title="Interface direta, ações claras."
        intro="Sem distração, sem jargão de software. Cada tela existe pra resolver uma decisão agronômica."
        bullets={[
          'Monitoramento de culturas em tempo real',
          'Cálculo automático da lâmina de irrigação por Kc',
          'Alertas meteorológicos personalizados',
          'Relatórios de produtividade',
        ]}
        cta={{ label: 'Testar o app', href: '/contato' }}
        image={sppDashboard}
        imageAlt="Dashboard SPP"
      />

      <UseCases
        eyebrow="Cultivos suportados"
        title="Especializado por cultura."
        intro="Mesmo motor, ajuste fino por tipo de cultivo."
        items={[
          { title: 'Hortaliças', description: 'Ciclo curto, alta demanda hídrica — controle preciso.', points: ['Irrigação otimizada', 'Qualidade superior', 'Menos perda'] },
          { title: 'Fruticultura', description: 'Cultivo perene com manejo por estágio e safra.', points: ['Manejo por fase', 'Qualidade dos frutos', 'Produtividade constante'] },
          { title: 'Grãos', description: 'Grandes áreas com foco em eficiência e sustentabilidade.', points: ['Escala industrial', 'Economia de recursos', 'Sustentabilidade'] },
        ]}
      />

      <Testimonials
        eyebrow="Depoimentos"
        title="Quem já está rodando."
        intro="Histórias reais de quem trocou caderno por dado."
        items={TESTS}
      />

      <FinalCTA />
    </>
  );
}
