import { Container, Marquee, Reveal } from '@/components/visual';
import { Factory, Wheat, Beef, Leaf, Building2, Tractor, Beaker, Trees } from 'lucide-react';

const SECTORS = [
  { icon: Factory, label: 'Indústrias de beneficiamento' },
  { icon: Wheat, label: 'Sojicultura & grãos' },
  { icon: Tractor, label: 'Cooperativas agrícolas' },
  { icon: Beef, label: 'Pecuária de precisão' },
  { icon: Leaf, label: 'Cannabis medicinal' },
  { icon: Building2, label: 'Agroindústria integrada' },
  { icon: Beaker, label: 'P&D e melhoramento' },
  { icon: Trees, label: 'Florestais & celulose' },
];

export default function TrustBar() {
  return (
    <section className="relative border-y border-border bg-surface/40">
      <Container className="py-10">
        <Reveal className="mb-6 flex flex-col items-center gap-3 text-center">
          <span className="text-eyebrow text-muted-foreground">
            Tecnologia presente em operações reais
          </span>
        </Reveal>
        <Marquee speed="slow" className="opacity-90">
          {SECTORS.map((s) => {
            const Icon = s.icon;
            return (
              <div
                key={s.label}
                className="inline-flex items-center gap-3 whitespace-nowrap text-foreground/70"
              >
                <Icon className="size-5 text-emerald-glow" strokeWidth={1.5} />
                <span className="font-display text-sm font-medium tracking-wide">{s.label}</span>
                <span className="ml-6 size-1 rounded-full bg-foreground/20" />
              </div>
            );
          })}
        </Marquee>
      </Container>
    </section>
  );
}
