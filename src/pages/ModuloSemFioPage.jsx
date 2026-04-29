import { Cpu, Wifi, Smartphone, Settings, Thermometer, Zap } from 'lucide-react';
import { SEO, productSchema } from '@/components/visual';
import { PageHero, FeatureGrid, SpecsTable, MetricStrip, UseCases, FinalCTA } from '@/components/sections';
import iotImg from '../assets/modulo-sem-fio-hero-v2.webp';

const FEATURES = [
  { icon: Wifi, title: 'Conectividade sem fio', description: 'WiFi 2.4GHz + Bluetooth 5.0 pra controle remoto total.' },
  { icon: Cpu, title: 'Processamento embedded', description: 'Microcontrolador com firmware otimizado pra automação complexa.' },
  { icon: Settings, title: 'Controle de equipamentos', description: 'Bombas, ventiladores, luzes, irrigação — 8 relés programáveis.' },
  { icon: Smartphone, title: 'Integrado ao app', description: 'Controle direto via Grow-X App.' },
  { icon: Thermometer, title: 'Sensores integrados', description: 'Temperatura, umidade, pH e EC.' },
  { icon: Zap, title: 'Baixo consumo', description: 'Eficiência energética pra operação 24/7.' },
];

const SPECS = {
  'Conectividade': 'WiFi 2.4 GHz + Bluetooth 5.0',
  'Alimentação': '12V DC ou bateria 3500 mAh',
  'Saídas': '8 relés programáveis (250V/10A)',
  'Entradas': '6 analógicas/digitais',
  'Sensores nativos': 'Temp · Umidade · pH · EC',
  'Proteção': 'IP65 — resistente à água',
  'Faixa térmica': '-20 °C a +70 °C',
  'Atualização': 'OTA via WiFi',
};

const METRICS = [
  { value: '4 zonas', label: 'Controle simultâneo de estufas' },
  { value: '8 relés', label: 'Saídas programáveis' },
  { value: 'WiFi + BT', label: 'Conectividade dual' },
  { value: 'IP65', label: 'Proteção contra água' },
];

export default function ModuloSemFioPage() {
  return (
    <>
      <SEO
        title="Módulo Sem Fio — Controle inteligente de até 4 estufas"
        description="Controle wireless de até 4 estufas com 8 relés programáveis, sensores integrados e malha mesh. Integrado ao Grow-X App."
        path="/produtos/modulo-sem-fio"
        jsonLd={productSchema({
          name: 'Módulo Sem Fio Grow-X',
          description: 'Controle wireless de até 4 estufas. WiFi + BT, 8 relés, sensores integrados (T/UR/pH/EC), OTA, IP65.',
          image: '/og-image.svg',
          sku: 'GX-MSF-V2',
          category: 'Hardware agro · Automação de estufa',
        })}
      />

      <PageHero
        eyebrow="Hardware · Automação"
        eyebrowIcon={Cpu}
        title={<>Automação de estufas, <span className="text-emerald-glow">sem fio.</span></>}
        intro="Sistema de controle inteligente pra automação completa de estufas e ambientes de cultivo. Plug, configure, opere."
        primaryCta={{ label: 'Solicitar orçamento', href: '/contato' }}
        secondaryCta={{ label: 'Ver todos os produtos', href: '/produtos' }}
        image={iotImg}
        imageAlt="Módulo sem fio Grow-X"
      />

      <MetricStrip items={METRICS} />

      <FeatureGrid
        eyebrow="Recursos avançados"
        title="Automação de ponta — sem cabo passando lavoura."
        items={FEATURES}
      />

      <UseCases
        eyebrow="Aplicações"
        title="Versátil pra cada cenário de cultivo."
        items={[
          { title: 'Cannabis medicinal', description: 'Controle preciso de clima e iluminação pra cultivo indoor de padrão farmacêutico.', points: ['Climate ctrl ±1°C', 'Iluminação por fase', 'Logger de eventos'] },
          { title: 'Agricultura urbana', description: 'Automação de hidroponia e aeroponia em pequena escala.', points: ['pH/EC integrado', 'Irrigação por ciclo', 'Mobile-first'] },
          { title: 'Estufas comerciais', description: 'Gestão automatizada de estruturas grandes de cultivo protegido.', points: ['Multi-zona', 'Integração ERP', 'Suporte técnico'] },
        ]}
      />

      <SpecsTable
        eyebrow="Ficha técnica"
        title="Especificações completas."
        specs={SPECS}
      />

      <FinalCTA />
    </>
  );
}
