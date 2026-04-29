import { SEO } from '@/components/visual';
import Hero from '@/components/sections/Hero';
import LiveTicker from '@/components/sections/LiveTicker';
import ChoosePath from '@/components/sections/ChoosePath';
import TrustStrip from '@/components/sections/TrustStrip';
import LogoCloud from '@/components/sections/LogoCloud';
import ProblemSection from '@/components/sections/ProblemSection';
import BentoSolutions from '@/components/sections/BentoSolutions';
import SensorRingSection from '@/components/sections/SensorRingSection';
import LiveTerminal from '@/components/sections/LiveTerminal';
import HardwareSVG from '@/components/sections/HardwareSVG';
import Differentiators from '@/components/sections/Differentiators';
import ByProfile from '@/components/sections/ByProfile';
import Insights from '@/components/sections/Insights';
import StorySection from '@/components/sections/StorySection';
import FAQ from '@/components/sections/FAQ';
import FinalCTA from '@/components/sections/FinalCTA';

const HOME_FAQ = [
  {
    q: 'A Grow-X é uma empresa de cannabis ou de agro?',
    a: 'É uma empresa de tecnologia. Operamos duas frentes: agro/indústria (Supply-X, SPI, SPP) e cultivo controlado / cannabis medicinal (Grow-X App). Hardware é compartilhado, mas os funis e públicos são distintos.',
  },
  {
    q: 'Quanto tempo leva pra colocar a Grow-X em produção?',
    a: 'B2B industrial: 30–90 dias de implantação dependendo do escopo. Cultivo controlado: imediato após hardware instalado. Sempre temos plano de migração faseado pra não interromper a operação atual.',
  },
  {
    q: 'O hardware Grow-X funciona onde a internet é ruim?',
    a: 'Sim. Estação meteorológica usa LoRa de até 15 km. Módulo Sem Fio tem mesh local. Toda a stack foi desenhada pra rede precária e edge computing — decisão crítica acontece localmente, sincroniza quando dá.',
  },
  {
    q: 'Vocês integram com meu ERP / sistema atual?',
    a: 'Sim. SPI e Supply-X são API-first. Conectamos com Totvs, SAP, Sankhya e qualquer sistema com API ou export estruturado. Não substituímos seu ERP — orquestramos a operação que ele não cobre.',
  },
  {
    q: 'Como funciona a cobrança / contrato?',
    a: 'B2B: contrato anual ou plurianual com setup + mensalidade. Cultivo: hardware sob demanda + assinatura mensal do app. Detalhes na demo.',
  },
  {
    q: 'Onde a Grow-X opera?',
    a: 'Sediada em Curitiba/PR. Atendemos todo o Brasil. Time engenharia + agronomia + jurídico no mesmo prédio.',
  },
];

export default function HomePage() {
  return (
    <>
      <SEO
        title="Inteligência operacional para o agro brasileiro"
        description="Stack agro brasileira: hardware, software e dados operando 24/7. Supply-X, SPI, SPP e Grow-X App — construídos em produção."
        path="/"
      />
      <Hero />
      <LiveTicker />
      <ChoosePath />
      <TrustStrip />
      <ProblemSection />
      <BentoSolutions />
      <SensorRingSection />
      <LiveTerminal />
      <HardwareSVG />
      <Differentiators />
      <ByProfile />
      <Insights />
      <StorySection />
      <LogoCloud />
      <FAQ
        title="Dúvidas que recebemos toda semana."
        intro="Resposta direta. Se ficou faltando, chama no WhatsApp."
        items={HOME_FAQ}
      />
      <FinalCTA />
    </>
  );
}
