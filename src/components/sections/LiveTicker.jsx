import { useEffect, useState } from 'react';
import { Leaf, Droplets, Thermometer, Radio, Activity, Sprout, Wheat } from 'lucide-react';

/**
 * Live ticker bar — rolls operational signals (sensors, temp, humidity, commodities).
 * Atmosphere: "sistema vivo rodando em produção".
 */
const BASE_FEED = [
  { icon: Radio, label: 'Sensores ativos', value: 428, unit: '' },
  { icon: Thermometer, label: 'Temp. média estufa', value: 24.8, unit: '°C', decimals: 1 },
  { icon: Droplets, label: 'Umidade média', value: 62, unit: '%' },
  { icon: Sprout, label: 'Estufas online', value: 37, unit: '' },
  { icon: Activity, label: 'Eventos/hora', value: 1842, unit: '' },
  { icon: Wheat, label: 'Talhões monitorados', value: 94, unit: '' },
  { icon: Leaf, label: 'Ciclos em curso', value: 22, unit: '' },
];

function jitter(v, decimals = 0) {
  const delta = (Math.random() - 0.5) * (decimals ? 0.3 : 2);
  const next = v + delta;
  return decimals ? +next.toFixed(decimals) : Math.round(next);
}

export default function LiveTicker() {
  const [feed, setFeed] = useState(BASE_FEED);

  useEffect(() => {
    const id = setInterval(() => {
      setFeed((prev) => prev.map((f) => ({ ...f, value: jitter(f.value, f.decimals) })));
    }, 2400);
    return () => clearInterval(id);
  }, []);

  const loop = [...feed, ...feed];

  return (
    <div className="relative isolate overflow-hidden border-y border-white/[0.06] bg-background/60 backdrop-blur">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-background to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-background to-transparent" />
      <div className="flex w-max marquee-track gap-10 py-3" style={{ animationDuration: '60s' }}>
        {loop.map((f, i) => {
          const Icon = f.icon;
          return (
            <div key={i} className="inline-flex shrink-0 items-center gap-2.5 whitespace-nowrap">
              <Icon className="size-3.5 text-emerald-glow" strokeWidth={1.75} />
              <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">{f.label}</span>
              <span className="font-mono text-[11px] font-semibold text-foreground">
                {f.value}{f.unit}
              </span>
              <span className="ml-2 size-1 rounded-full bg-emerald/50" />
            </div>
          );
        })}
      </div>
    </div>
  );
}
