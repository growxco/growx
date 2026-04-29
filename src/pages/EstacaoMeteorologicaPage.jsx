import { CloudSun, Thermometer, Droplets, Wind, Cloud, Zap, Smartphone, Eye, Shield } from 'lucide-react';
import { SEO, productSchema } from '@/components/visual';
import { PageHero, FeatureGrid, SpecsTable, MetricStrip, FinalCTA } from '@/components/sections';
import estacaoImg from '../assets/estacao-meteorologica-hero-v2.webp';

const FEATURES = [
  { icon: Thermometer, title: 'Temperatura precisa', description: 'Monitoramento contínuo com precisão de ±0.1°C.' },
  { icon: Droplets, title: 'Umidade do ar e solo', description: 'Sensores que cobrem solo e atmosfera — decisão hídrica completa.' },
  { icon: Wind, title: 'Vento', description: 'Velocidade e direção pra otimizar aplicação e irrigação.' },
  { icon: Cloud, title: 'Previsão local', description: 'Integração climática pra planejamento agronômico.' },
  { icon: Zap, title: 'LoRa de longo alcance', description: 'Comunicação até 15 km com baixo consumo.' },
  { icon: Smartphone, title: 'SPP integrado', description: 'Dados ao vivo direto no app do produtor.' },
];

const BENEFITS = [
  { icon: Droplets, title: 'Economia hídrica', description: 'Até 40% menos água com irrigação orientada por dado.' },
  { icon: Eye, title: 'Monitoramento 24/7', description: 'Dados meteorológicos em tempo real, sem pausa.' },
  { icon: Shield, title: 'Prevenção de perdas', description: 'Alertas antecipados pra condições adversas.' },
];

const SPECS = {
  'Alcance LoRa': 'Até 15 km em campo aberto',
  'Autonomia': '12+ meses (bateria) · indefinido com solar',
  'Resistência': 'IP67 — à prova d\'água e poeira',
  'Faixa térmica': '-40 °C a +85 °C',
  'Conectividade': 'LoRa 915 MHz · 4G opcional',
  'Sensores': 'Temp · umidade ar/solo · vento · chuva · radiação',
  'Alimentação': 'Bateria 3.6V + painel solar 5W',
  'Atualização firmware': 'OTA via gateway',
};

const METRICS = [
  { value: '15 km', label: 'Alcance LoRa em campo aberto' },
  { value: '±0.1 °C', label: 'Precisão de temperatura' },
  { value: 'IP67', label: 'Resistência a chuva e poeira' },
  { value: '12+ m', label: 'Autonomia de bateria' },
];

export default function EstacaoMeteorologicaPage() {
  return (
    <>
      <SEO
        title="Estação Meteorológica — Sensores LoRa de alta precisão"
        description="Sensores meteorológicos LoRa pra monitoramento preciso do microclima. Solar, IP67, integrado ao app SPP."
        path="/produtos/estacao-meteorologica"
        jsonLd={productSchema({
          name: 'Estação Meteorológica Grow-X',
          description: 'Sensores LoRa de alta precisão para microclima local. IP67, painel solar, integração com SPP.',
          image: '/og-image.svg',
          sku: 'GX-EM-V3',
          category: 'Hardware agro · Sensoriamento meteorológico',
        })}
      />

      <PageHero
        eyebrow="Hardware · Sensoriamento"
        eyebrowIcon={CloudSun}
        title={<>Microclima local com <span className="text-emerald-glow">precisão de campo.</span></>}
        intro="Sensores LoRa de alta precisão pra monitoramento contínuo de propriedades rurais. Solar, à prova d'água, conectado ao app SPP."
        primaryCta={{ label: 'Solicitar orçamento', href: '/contato' }}
        secondaryCta={{ label: 'Ver todos os produtos', href: '/produtos' }}
        image={estacaoImg}
        imageAlt="Estação meteorológica Grow-X"
      />

      <MetricStrip items={METRICS} />

      <FeatureGrid
        eyebrow="Recursos avançados"
        title="Tecnologia de ponta no monitoramento."
        intro="Cada sensor escolhido pra resolver uma decisão agronômica específica."
        items={FEATURES}
      />

      <FeatureGrid
        eyebrow="Benefícios pro produtor"
        title="Impacto direto no resultado."
        items={BENEFITS}
        columns={3}
      />

      <SpecsTable
        eyebrow="Ficha técnica"
        title="Especificações completas."
        intro="Tudo o que importa pra avaliação técnica e dimensionamento."
        specs={SPECS}
      />

      <FinalCTA />
    </>
  );
}
