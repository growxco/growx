import { useEffect, useState } from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { GlassCard, Sparkline, StatusDot } from '@/components/visual';

/**
 * Live KPI panel — terminal-inspired HUD. Sits inside hero.
 */
const KPIS = [
  { key: 'sensors', label: 'Sensores ativos', base: 428, delta: +2.4, trend: 'up' },
  { key: 'humidity', label: 'Umidade média', base: 62, unit: '%', delta: +0.6, trend: 'up' },
  { key: 'temp', label: 'Temperatura', base: 24.8, unit: '°C', delta: -0.3, trend: 'down', decimals: 1 },
  { key: 'events', label: 'Eventos/h', base: 1842, delta: +3.1, trend: 'up' },
];

export default function LiveKPIPanel() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const hh = String(time.getHours()).padStart(2, '0');
  const mm = String(time.getMinutes()).padStart(2, '0');
  const ss = String(time.getSeconds()).padStart(2, '0');

  return (
    <GlassCard variant="strong" className="border-gradient-emerald shadow-elevated overflow-hidden">
      {/* header */}
      <div className="flex items-center gap-2.5 border-b border-white/10 px-4 py-3">
        <span className="size-2 rounded-full bg-foreground/30" />
        <span className="size-2 rounded-full bg-foreground/30" />
        <span className="size-2 rounded-full bg-foreground/30" />
        <span className="ml-3 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
          grow-x · ops console
        </span>
        <span className="ml-auto flex items-center gap-2.5">
          <StatusDot label="LIVE" />
          <span className="font-mono text-[11px] text-muted-foreground tabular-nums">
            {hh}:{mm}:{ss}
          </span>
        </span>
      </div>

      {/* sparkline chart */}
      <div className="relative border-b border-white/[0.06] bg-gradient-to-br from-[oklch(0.18_0.022_150)] to-[oklch(0.22_0.025_150)] p-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Throughput de eventos</div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-display text-3xl font-bold text-foreground">1 842</span>
              <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald/15 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-emerald-glow">
                <ArrowUpRight className="size-2.5" />+3.1%
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">últimos 60 min</div>
          </div>
        </div>
        <div className="mt-3">
          <Sparkline width={320} height={64} className="w-full" />
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-px bg-white/5 sm:grid-cols-4">
        {KPIS.map((k) => {
          const TrendIcon = k.trend === 'up' ? ArrowUpRight : ArrowDownRight;
          const trendClass = k.trend === 'up' ? 'text-emerald-glow' : 'text-[oklch(0.72_0.15_35)]';
          return (
            <div key={k.key} className="bg-surface p-4">
              <div className="flex items-start justify-between">
                <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{k.label}</span>
                <TrendIcon className={`size-3 ${trendClass}`} />
              </div>
              <div className="mt-1.5 flex items-baseline gap-0.5">
                <span className="font-display text-lg font-bold text-foreground tabular-nums">
                  {k.base}
                </span>
                {k.unit && <span className="text-[10px] text-muted-foreground">{k.unit}</span>}
              </div>
              <div className={`mt-0.5 font-mono text-[10px] ${trendClass}`}>
                {k.delta > 0 ? '+' : ''}{k.delta}%
              </div>
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
}
