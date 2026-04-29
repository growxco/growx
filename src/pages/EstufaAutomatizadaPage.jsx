import { Sprout, Thermometer, Droplets, Sun, Wind, Smartphone, Eye, Zap, Shield, Leaf } from 'lucide-react';
import { SEO, productSchema } from '@/components/visual';
import { PageHero, FeatureGrid, SpecsTable, MetricStrip, UseCases, FinalCTA } from '@/components/sections';
import estufaImg from '../assets/estufa-automatizada-hero-v2.webp';

const FEATURES = [
  { icon: Thermometer, title: 'Climatização', description: 'Aquecimento, resfriamento e umidificação automáticos.' },
  { icon: Droplets, title: 'Irrigação inteligente', description: 'Gotejamento + nebulização baseados em sensores de solo.' },
  { icon: Sun, title: 'Iluminação LED full spectrum', description: 'Simulação de nascer/pôr do sol, ciclos personalizáveis.' },
  { icon: Wind, title: 'Ventilação automática', description: 'Exaustores e circulação controlados em tempo real.' },
  { icon: Eye, title: 'Monitoramento 24/7', description: 'Câmeras e sensores acompanham cada parâmetro.' },
  { icon: Smartphone, title: 'Controle remoto', description: 'Operação completa via Grow-X App.' },
];

const BENEFITS = [
  { icon: Leaf, title: 'Produtividade máxima', description: 'Ambiente controlado pro melhor rendimento por planta.' },
  { icon: Zap, title: 'Eficiência energética', description: 'Sistemas otimizados pra menor consumo elétrico.' },
  { icon: Shield, title: 'Proteção total', description: 'Ambiente blindado contra praga e clima adverso.' },
];

const SPECS = {
  'Tamanhos': '2×2 m · 3×3 m · 4×4 m (personalizável)',
  'Estrutura': 'Alumínio anodizado resistente',
  'Cobertura': 'Policarbonato duplo ou vidro',
  'Iluminação': 'LED full spectrum 600–1000 W',
  'Ventilação': 'Sistema de exaustão + circulação',
  'Climate ctrl': 'Temperatura ±1 °C · UR ±3%',
  'Conectividade': 'WiFi + 4G',
  'Automação': 'Módulo Grow-X integrado',
};

const METRICS = [
  { value: '±1 °C', label: 'Precisão climática' },
  { value: 'Full spec.', label: 'Iluminação LED programável' },
  { value: '24/7', label: 'Monitoramento ininterrupto' },
  { value: 'Modular', label: 'Tamanhos sob demanda' },
];

export default function EstufaAutomatizadaPage() {
  return (
    <>
      <SEO
        title="Estufa Automatizada — Cultivo controlado completo"
        description="Sistema completo de cultivo indoor com automação total: clima, iluminação, irrigação e monitoramento. Padrão farmacêutico."
        path="/produtos/estufa-automatizada"
        jsonLd={productSchema({
          name: 'Estufa Automatizada Grow-X',
          description: 'Cultivo indoor padrão farmacêutico: 2×2 a 4×4m, LED full spectrum 600-1000W, climate ctrl ±1°C, WiFi+4G.',
          image: '/og-image.svg',
          sku: 'GX-EA-MOD',
          category: 'Hardware agro · Cultivo controlado',
        })}
      />

      <PageHero
        eyebrow="Hardware · Cultivo controlado"
        eyebrowIcon={Sprout}
        title={<>Cultivo indoor com <span className="text-emerald-glow">padrão farmacêutico.</span></>}
        intro="Sistema completo: clima, irrigação, iluminação e monitoramento. Ideal pra cannabis medicinal, agricultura urbana e cultivo especializado."
        primaryCta={{ label: 'Solicitar projeto', href: '/contato' }}
        secondaryCta={{ label: 'Ver todos os produtos', href: '/produtos' }}
        image={estufaImg}
        imageAlt="Estufa automatizada Grow-X"
      />

      <MetricStrip items={METRICS} />

      <FeatureGrid
        eyebrow="Recursos completos"
        title="Tudo integrado, automaticamente."
        items={FEATURES}
      />

      <UseCases
        eyebrow="Sistemas integrados"
        title="Quatro motores em uma só estrutura."
        items={[
          { title: 'Climatização', description: 'Controle preciso de temperatura, umidade — aquecedores, resfriadores e umidificadores.', points: ['Histerese ajustável', 'Curva por fase', 'Logger contínuo'] },
          { title: 'Irrigação', description: 'Gotejamento automatizado com sensores de umidade do solo, nebulização opcional.', points: ['Multi-zona', 'Cronograma por cultura', 'Alerta de bomba'] },
          { title: 'Iluminação', description: 'LED full spectrum com simulação de nascer/pôr do sol, intensidade e ciclos.', points: ['Curva PPFD', 'Espectro programável', 'Dimming suave'] },
        ]}
      />

      <FeatureGrid
        eyebrow="Vantagens da estufa"
        title="Por que vale o investimento."
        items={BENEFITS}
        columns={3}
      />

      <SpecsTable
        eyebrow="Especificações"
        title="Ficha técnica completa."
        specs={SPECS}
      />

      <FinalCTA />
    </>
  );
}
