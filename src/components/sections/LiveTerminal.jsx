import { useEffect, useState } from 'react';
import { Section, GlassCard, Sparkline, Gauge, StatusDot, Reveal } from '@/components/visual';
import { Activity, Zap, Droplets } from 'lucide-react';

const EVENT_TEMPLATES = [
  { type: 'INFO', text: 'Estufa #07 — ciclo de irrigação concluído', color: 'emerald' },
  { type: 'OK', text: 'Sensor LoRa-128 reconectado (campo: talhão leste)', color: 'emerald' },
  { type: 'ALERT', text: 'Estufa #12 — UR acima de 78% por 4 min', color: 'amber' },
  { type: 'OK', text: 'Dashboard SPI sincronizado com ERP Totvs', color: 'emerald' },
  { type: 'INFO', text: 'Kc atualizado por fase · Soja t05 · fase R3', color: 'emerald' },
  { type: 'OK', text: 'Colheita #4291 · lote 2318 · documentado', color: 'emerald' },
  { type: 'INFO', text: 'Nova leitura climática · EM-412 · vento 8.4 m/s', color: 'emerald' },
  { type: 'OK', text: 'Firmware OTA deployed em 48 módulos', color: 'emerald' },
];

export default function LiveTerminal() {
  const [events, setEvents] = useState(EVENT_TEMPLATES.slice(0, 6).map((e, i) => ({ ...e, id: i, t: Date.now() - i * 60000 })));

  useEffect(() => {
    const id = setInterval(() => {
      setEvents((prev) => {
        const template = EVENT_TEMPLATES[Math.floor(Math.random() * EVENT_TEMPLATES.length)];
        const next = { ...template, id: Date.now(), t: Date.now() };
        return [next, ...prev.slice(0, 5)];
      });
    }, 3200);
    return () => clearInterval(id);
  }, []);

  const fmt = (t) => {
    const d = new Date(t);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
  };

  return (
    <Section
      eyebrow="Operação ao vivo"
      title={
        <>
          Isso aqui não é <span className="text-emerald-glow">demo.</span>
        </>
      }
      intro="Uma amostra da camada operacional — eventos, throughput e estado de estufas acontecendo agora mesmo."
    >
      <Reveal>
        <div className="grid gap-5 lg:grid-cols-12">
          {/* Event ledger */}
          <GlassCard variant="strong" className="overflow-hidden lg:col-span-5">
            <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
              <Activity className="size-3.5 text-emerald-glow" />
              <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">event stream</span>
              <StatusDot label="LIVE" className="ml-auto" />
            </div>
            <ul className="divide-y divide-white/[0.04]">
              {events.map((e) => (
                <li key={e.id} className="flex items-start gap-3 px-4 py-3">
                  <span className="mt-0.5 font-mono text-[10px] text-muted-foreground tabular-nums">{fmt(e.t)}</span>
                  <span
                    className={
                      'mt-0.5 rounded px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wider ' +
                      (e.color === 'emerald'
                        ? 'bg-emerald/15 text-emerald-glow'
                        : 'bg-[oklch(0.72_0.15_75/15%)] text-[oklch(0.85_0.14_75)]')
                    }
                  >
                    {e.type}
                  </span>
                  <span className="text-xs leading-snug text-foreground/85">{e.text}</span>
                </li>
              ))}
            </ul>
          </GlassCard>

          {/* Chart panel */}
          <GlassCard variant="strong" className="overflow-hidden lg:col-span-4">
            <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
              <Zap className="size-3.5 text-emerald-glow" />
              <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">throughput</span>
              <StatusDot label="LIVE" className="ml-auto" />
            </div>
            <div className="p-5">
              <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Eventos / hora</div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="font-display text-3xl font-bold text-foreground tabular-nums">1 842</span>
                <span className="font-mono text-[10px] text-emerald-glow">+3.1%</span>
              </div>
              <div className="mt-4">
                <Sparkline width={280} height={80} speed={1400} className="w-full" />
              </div>
              <div className="mt-5 flex items-center justify-between border-t border-white/[0.06] pt-4 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                <span>p50 · 240ms</span>
                <span>p95 · 612ms</span>
                <span>p99 · 1.2s</span>
              </div>
            </div>
          </GlassCard>

          {/* Gauges panel */}
          <GlassCard variant="strong" className="overflow-hidden lg:col-span-3">
            <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
              <Droplets className="size-3.5 text-emerald-glow" />
              <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">estufas</span>
            </div>
            <div className="grid grid-cols-2 gap-4 p-5">
              <Gauge label="Estufa 07" value={68} />
              <Gauge label="Estufa 12" value={82} />
              <Gauge label="Estufa 18" value={54} />
              <Gauge label="Estufa 22" value={76} />
            </div>
          </GlassCard>
        </div>
      </Reveal>
    </Section>
  );
}
