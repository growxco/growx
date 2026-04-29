import { Link } from 'react-router-dom';
import { Cpu, Wifi, Cloud, Battery, Shield, ArrowRight, CloudSun, Sprout } from 'lucide-react';
import { SEO, Container, Section, Eyebrow, Reveal, Aurora, GridPattern } from '@/components/visual';
import { FeatureGrid, FinalCTA, LiveTicker } from '@/components/sections';
import estacaoMeteorologica from '../assets/estacao-meteorologica.webp';
import estufaAutomatizada from '../assets/estufa-automatizada.jpg';
import iotImg from '../assets/iot-sensors-farm.jpg';

const PRODUCTS = [
  {
    id: 'estacao-meteorologica',
    name: 'Estação Meteorológica',
    icon: CloudSun,
    href: '/produtos/estacao-meteorologica',
    image: estacaoMeteorologica,
    desc: 'Sensores LoRa de alta precisão pra microclima local. Decisão agronômica baseada em dado real, não estimativa de satélite.',
    chips: ['LoRa 915 MHz', 'IP67', 'Solar 24/7', 'Bateria 2+ anos'],
  },
  {
    id: 'modulo-sem-fio',
    name: 'Módulo Sem Fio',
    icon: Cpu,
    href: '/produtos/modulo-sem-fio',
    image: iotImg,
    desc: 'Controle wireless de até 4 estufas com 8 relés programáveis, sensores integrados e malha mesh.',
    chips: ['4 zonas', 'WiFi + BT', '8 relés', 'OTA'],
  },
  {
    id: 'estufa-automatizada',
    name: 'Estufa Automatizada',
    icon: Sprout,
    href: '/produtos/estufa-automatizada',
    image: estufaAutomatizada,
    desc: 'Ambiente de cultivo completo: clima, iluminação programável e irrigação de precisão.',
    chips: ['Climate ctrl', 'PPFD on-demand', 'Logger', 'WiFi + 4G'],
  },
];

const COMMON = [
  { icon: Wifi, title: 'Conectividade IoT', description: 'LoRa, WiFi e 4G — pra rede precária e área remota.' },
  { icon: Cloud, title: 'Dados na nuvem', description: 'Histórico completo, acessível de qualquer lugar.' },
  { icon: Battery, title: 'Longa autonomia', description: 'Bateria de longa duração + painel solar opcional.' },
  { icon: Shield, title: 'Resistência industrial', description: 'IP67, projetado pra calor, poeira e umidade.' },
];

export default function ProductsPage() {
  return (
    <>
      <SEO
        title="Produtos — Hardware agro brasileiro"
        description="Estação meteorológica LoRa, módulo sem fio e estufa automatizada. Hardware desenhado pra condições reais do agro."
        path="/produtos"
      />

      {/* Hero */}
      <section className="relative isolate overflow-hidden pt-16 pb-16 sm:pt-20 lg:pt-28">
        <Aurora intensity="md" />
        <GridPattern fine mask="bottom" />
        <Container>
          <Reveal className="max-w-3xl">
            <Eyebrow icon={Cpu}>Hardware</Eyebrow>
            <h1 className="mt-6 text-display-xl text-foreground">
              Engenharia brasileira para <span className="text-emerald-glow">condições reais.</span>
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-muted-foreground sm:text-xl">
              Sensores, módulos e estufas projetados pra rede precária, calor de campo, poeira e umidade.
              Atualizados over-the-air, integrados às nossas plataformas.
            </p>
          </Reveal>
        </Container>
      </section>

      <LiveTicker />

      {/* Product cards */}
      <Section size="tight">
        <div className="grid gap-6 lg:grid-cols-3">
          {PRODUCTS.map((p, i) => {
            const Icon = p.icon;
            return (
              <Reveal key={p.id} delay={i * 0.08} className="h-full">
                <Link
                  to={p.href}
                  className="group block h-full overflow-hidden rounded-2xl surface lift hover:border-[oklch(0.700_0.180_145/45%)]"
                >
                  <div className="relative aspect-[4/3] overflow-hidden border-b border-border">
                    <img src={p.image} alt={p.name} className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/30 to-transparent" />
                    <div className="absolute left-4 top-4 inline-flex size-11 items-center justify-center rounded-xl bg-background/70 text-emerald-glow ring-hairline backdrop-blur">
                      <Icon className="size-5" />
                    </div>
                    <div className="absolute bottom-4 left-4 right-4 flex flex-wrap gap-1.5">
                      {p.chips.map((c) => (
                        <span key={c} className="rounded-full bg-background/70 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-foreground/80 ring-hairline backdrop-blur">
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="p-7">
                    <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">{p.name}</h2>
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{p.desc}</p>
                    <div className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-glow">
                      Especificações & detalhes
                      <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" />
                    </div>
                  </div>
                </Link>
              </Reveal>
            );
          })}
        </div>
      </Section>

      <FeatureGrid
        eyebrow="Tecnologia comum"
        title="Padrão Grow-X em todo hardware."
        intro="Quatro fundamentos não-negociáveis em qualquer produto que sai daqui."
        items={COMMON}
        columns={4}
      />

      <FinalCTA />
    </>
  );
}
