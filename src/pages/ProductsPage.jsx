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
    chips: ['Sensores compatíveis', 'Escopo a confirmar'],
  },
  {
    id: 'modulo-sem-fio',
    name: 'Módulo Sem Fio',
    icon: Cpu,
    href: '/produtos/modulo-sem-fio',
    image: iotImg,
    desc: 'Módulo documentado com seis saídas AC, DHT22 e sensores compatíveis. Kit e atuação física em validação.',
    chips: ['6 saídas AC', 'DHT22', 'Kit em validação'],
  },
  {
    id: 'estufa-automatizada',
    name: 'Estufa Automatizada',
    icon: Sprout,
    href: '/produtos/estufa-automatizada',
    image: estufaAutomatizada,
    desc: 'Ambiente de cultivo completo: clima, iluminação programável e irrigação de precisão.',
    chips: ['Composição a confirmar', 'Projeto avaliado'],
  },
];

const COMMON = [
 {icon: Wifi, title:'Compatibilidade', description:'Sensores, equipamentos e conectividade são avaliados no projeto.'},
 {icon: Cloud, title:'Informações disponíveis', description:'Confira recursos e permissões demonstrados antes de contratar.'},
 {icon: Battery, title:'Composição do kit', description:'Acessórios, alimentação e instalação precisam constar da proposta.'},
 {icon: Shield, title:'Instalação confirmada', description:'Características essenciais e condições de uso são verificadas antes da contratação.'},
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
              Conheça os percursos de avaliação de sensores, módulo e ambiente de cultivo. Composição, instalação e recursos são definidos na proposta.
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
