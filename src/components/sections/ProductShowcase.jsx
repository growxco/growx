import { Link } from 'react-router-dom';
import { Cpu, Sprout, CloudSun, ArrowRight } from 'lucide-react';
import { Section, Reveal } from '@/components/visual';
import estacao from '../../assets/estacao-meteorologica.webp';
import estufa from '../../assets/estufa-automatizada.jpg';
import iotImg from '../../assets/iot-sensors-farm.jpg';

const PRODUCTS = [
  {
    href: '/produtos/estacao-meteorologica',
    icon: CloudSun,
    name: 'Estação Meteorológica',
    desc: 'Sensores LoRa de alta precisão para microclima local. Decisões agrícolas com dado real, não estimativa de satélite.',
    image: estacao,
    spec: ['LoRa 915 MHz', 'IP67', 'Solar 24/7'],
  },
  {
    href: '/produtos/modulo-sem-fio',
    icon: Cpu,
    name: 'Módulo Sem Fio',
    desc: 'Controle inteligente de até 4 estufas: irrigação, ventilação, iluminação e atuadores em malha mesh.',
    image: iotImg,
    spec: ['4 zonas', 'Mesh', 'OTA updates'],
  },
  {
    href: '/produtos/estufa-automatizada',
    icon: Sprout,
    name: 'Estufa Automatizada',
    desc: 'Ambiente de cultivo completo: clima, iluminação programável e irrigação de precisão para alto desempenho.',
    image: estufa,
    spec: ['Climate ctrl', 'PPFD on-demand', 'Logger'],
  },
];

export default function ProductShowcase() {
  return (
    <Section
      eyebrow="Hardware"
      title={
        <>
          Engenharia brasileira para <span className="text-emerald-glow">condições reais.</span>
        </>
      }
      intro="Hardware desenhado pra rede precária, calor de campo, poeira e umidade. Atualizado over-the-air, integrado às nossas plataformas."
    >
      <div className="grid gap-5 md:grid-cols-3">
        {PRODUCTS.map((p, i) => {
          const Icon = p.icon;
          return (
            <Reveal key={p.href} delay={i * 0.08} className="h-full">
              <Link
                to={p.href}
                className="group block h-full overflow-hidden rounded-2xl surface lift hover:border-[oklch(0.700_0.180_145/45%)]"
              >
                <div className="relative aspect-[4/3] overflow-hidden border-b border-border">
                  <img
                    src={p.image}
                    alt={p.name}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />
                  <div className="absolute left-4 top-4">
                    <span className="inline-flex size-10 items-center justify-center rounded-xl bg-background/70 text-emerald-glow ring-hairline backdrop-blur">
                      <Icon className="size-5" />
                    </span>
                  </div>
                  <div className="absolute bottom-4 left-4 flex flex-wrap gap-1.5">
                    {p.spec.map((s) => (
                      <span key={s} className="rounded-full bg-background/70 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-foreground/80 ring-hairline backdrop-blur">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="text-lg font-semibold tracking-tight text-foreground">{p.name}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.desc}</p>
                  <div className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-glow">
                    Especificações
                    <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              </Link>
            </Reveal>
          );
        })}
      </div>
    </Section>
  );
}
