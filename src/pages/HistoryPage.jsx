import { Calendar, Lightbulb, Users, Target, Award } from 'lucide-react';
import { SEO, Container, Eyebrow, Reveal, Aurora, GridPattern } from '@/components/visual';
import { FeatureGrid, SplitFeature, FinalCTA } from '@/components/sections';
import campoImg from '../assets/bg-campo-growx.webp';
import iotImg from '../assets/iot-sensors-farm.jpg';

const VALUES = [
  { icon: Lightbulb, title: 'Inovação', description: 'Tecnologia de ponta aplicada ao agro brasileiro real.' },
  { icon: Users, title: 'Colaboração', description: 'Parceria com produtores, indústrias e cooperativas.' },
  { icon: Target, title: 'Sustentabilidade', description: 'Soluções que promovem agricultura responsável.' },
  { icon: Award, title: 'Excelência', description: 'Qualidade e rastreabilidade em cada entrega.' },
];

const CHAPTERS = [
  {
    eyebrow: 'Capítulo 1 · Origem',
    title: 'Nasce a partir do cultivo controlado.',
    text: 'A Grow-X nasceu pra transformar a experiência do cultivo indoor — aliando automação, IA e ambiente altamente controlado. O primeiro produto, o Grow-X App, virou referência pra growers brasileiros: monitoramento ao vivo, controle climático automatizado e integração com sensores ambientais.',
    image: iotImg,
  },
  {
    eyebrow: 'Capítulo 2 · Expansão',
    title: 'Do indoor pro agro de verdade.',
    text: 'Com o amadurecimento e a crescente demanda por soluções integradas, a Grow-X expandiu pra além do indoor. A expertise em sensoriamento, conectividade e automação gerou o Supply-X — plataforma modular que conecta produtores, transportadoras e indústrias numa cadeia rastreável e eficiente.',
    image: campoImg,
    reversed: true,
  },
  {
    eyebrow: 'Capítulo 3 · Hoje',
    title: 'Referência nacional em tecnologia agro.',
    text: 'Hoje a Grow-X é referência nacional em tecnologia pro agronegócio, com soluções escaláveis pra pequenos, médios e grandes produtores. Nossas ferramentas geram decisão assertiva, redução de desperdício, rastreabilidade total e ganho operacional pra toda a cadeia.',
    image: iotImg,
  },
];

export default function HistoryPage() {
  return (
    <>
      <SEO
        title="História — Da estufa indoor pro agronegócio nacional"
        description="A trajetória da Grow-X: do Grow-X App pro Supply-X. Engenharia agro brasileira em três capítulos."
        path="/sobre/historia"
      />

      {/* Hero */}
      <section className="relative isolate overflow-hidden pt-16 pb-16 sm:pt-20 lg:pt-28">
        <Aurora intensity="md" />
        <GridPattern fine mask="bottom" />
        <Container>
          <Reveal className="max-w-3xl">
            <Eyebrow icon={Calendar}>Nossa trajetória</Eyebrow>
            <h1 className="mt-6 text-display-xl text-foreground">
              Construído capítulo a capítulo, <span className="text-emerald-glow">na operação real.</span>
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-muted-foreground sm:text-xl">
              A Grow-X cresceu na prática — começando no cultivo controlado e evoluindo pra orquestrar cadeias agroindustriais inteiras.
              Cada produto resolveu uma dor específica antes de virar plataforma.
            </p>
          </Reveal>
        </Container>
      </section>

      {/* Three chapters */}
      {CHAPTERS.map((c) => (
        <SplitFeature
          key={c.title}
          eyebrow={c.eyebrow}
          title={c.title}
          intro={c.text}
          image={c.image}
          imageAlt={c.title}
          reversed={c.reversed}
        />
      ))}

      <FeatureGrid
        eyebrow="Valores que sustentam a operação"
        title="Quatro princípios que pautam cada decisão."
        items={VALUES}
        columns={4}
      />

      <FinalCTA />
    </>
  );
}
