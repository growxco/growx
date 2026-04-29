import { Globe, Factory, Tractor, Smartphone } from 'lucide-react';
import { Section, BentoCard, Reveal } from '@/components/visual';
import supplyXImg from '../../assets/supply-x-hero.webp';
import gxAppImg from '../../assets/growx-app-hero-cannabis.webp';

export default function BentoSolutions() {
  return (
    <Section
      eyebrow="Plataforma"
      title={
        <>
          Quatro produtos. <span className="text-emerald-glow">Uma operação.</span>
        </>
      }
      intro="Cada produto resolve uma camada da cadeia. Juntos, formam a infraestrutura digital do agro brasileiro."
    >
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-6 lg:auto-rows-[280px]">
        {/* Supply-X — destaque grande */}
        <Reveal className="lg:col-span-4 lg:row-span-2" delay={0}>
          <BentoCard
            to="/solucoes/supply-x"
            variant="feature"
            icon={Globe}
            eyebrow="Supply-X"
            title="A camada de orquestração que une indústria e campo."
            description="Plataforma modular que conecta SPI e SPP em uma única operação rastreável — do insumo ao produto final."
            image={supplyXImg}
            imageAlign="background"
            cta="Conhecer Supply-X"
            className="h-full min-h-[400px]"
          />
        </Reveal>

        {/* SPI */}
        <Reveal className="lg:col-span-2" delay={0.06}>
          <BentoCard
            to="/solucoes/spi"
            variant="emerald"
            icon={Factory}
            eyebrow="SPI"
            title="Indústria conectada"
            description="Dashboards, métricas e governança para o chão de fábrica agroindustrial."
            cta="Ver SPI"
            className="h-full"
          />
        </Reveal>

        {/* SPP */}
        <Reveal className="lg:col-span-2" delay={0.12}>
          <BentoCard
            to="/solucoes/spp"
            icon={Tractor}
            eyebrow="SPP"
            title="O app do produtor"
            description="Gestão de lotes, custos e decisões agronômicas direto da palma da mão."
            cta="Ver SPP"
            className="h-full"
          />
        </Reveal>

        {/* Grow-X App — destaque inferior */}
        <Reveal className="lg:col-span-6" delay={0.18}>
          <BentoCard
            to="/solucoes/growx-app"
            variant="feature"
            icon={Smartphone}
            eyebrow="Grow-X App"
            title="Cultivo controlado: cannabis medicinal e agricultura urbana de precisão."
            description="Monitoramento, automação e marketplace integrados — o primeiro clube canábico virtual do Brasil."
            image={gxAppImg}
            imageAlign="background"
            cta="Conhecer Grow-X App"
            className="h-full min-h-[280px]"
          />
        </Reveal>
      </div>
    </Section>
  );
}
