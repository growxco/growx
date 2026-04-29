import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Section, Reveal } from '@/components/visual';

/**
 * Hardware section with SVG editorial renders (no bitmap). Premium minimalist.
 */
const ITEMS = [
  {
    href: '/produtos/estacao-meteorologica',
    name: 'Estação Meteorológica',
    tagline: 'Microclima local',
    chips: ['LoRa 915', '±0.1 °C', 'IP67', 'Solar'],
    svg: <WeatherStation />,
  },
  {
    href: '/produtos/modulo-sem-fio',
    name: 'Módulo Sem Fio',
    tagline: 'Automação de estufas',
    chips: ['4 zonas', '8 relés', 'WiFi + BT', 'OTA'],
    svg: <WirelessModule />,
  },
  {
    href: '/produtos/estufa-automatizada',
    name: 'Estufa Automatizada',
    tagline: 'Cultivo controlado',
    chips: ['Climate', 'PPFD', 'Logger', 'WiFi + 4G'],
    svg: <Greenhouse />,
  },
];

export default function HardwareSVG() {
  return (
    <Section
      eyebrow="Hardware"
      title={
        <>
          Engenharia brasileira para <span className="text-emerald-glow">condições reais.</span>
        </>
      }
      intro="Sensores, módulos e estufas projetados pra poeira, calor e rede precária. Atualizados OTA."
    >
      <div className="grid gap-5 md:grid-cols-3">
        {ITEMS.map((p, i) => (
          <Reveal key={p.href} delay={i * 0.08} className="h-full">
            <Link
              to={p.href}
              className="group relative block h-full overflow-hidden rounded-2xl surface lift hover:border-[oklch(0.700_0.180_145/45%)]"
            >
              <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden border-b border-border bg-gradient-to-br from-[oklch(0.18_0.025_150)] to-[oklch(0.14_0.02_150)]">
                <div className="absolute inset-0 bg-grid-fine opacity-40 mask-radial-fade" />
                <div className="relative z-10 w-3/4 transition-transform duration-700 group-hover:scale-105">
                  {p.svg}
                </div>
              </div>
              <div className="p-6">
                <div className="text-eyebrow text-emerald-glow">{p.tagline}</div>
                <h3 className="mt-2 text-lg font-semibold tracking-tight text-foreground sm:text-xl">{p.name}</h3>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {p.chips.map((c) => (
                    <span key={c} className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      {c}
                    </span>
                  ))}
                </div>
                <div className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-glow">
                  Ficha técnica
                  <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </Link>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}

// ——————————————————— SVG RENDERS ———————————————————

function WeatherStation() {
  return (
    <svg viewBox="0 0 240 180" className="h-auto w-full">
      <defs>
        <linearGradient id="ws-body" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="oklch(0.32 0.025 150)" />
          <stop offset="100%" stopColor="oklch(0.20 0.02 150)" />
        </linearGradient>
      </defs>
      {/* mast */}
      <rect x="116" y="60" width="8" height="100" fill="url(#ws-body)" rx="2" />
      {/* solar panel */}
      <g transform="translate(60 20) rotate(-10)">
        <rect width="120" height="44" rx="4" fill="url(#ws-body)" stroke="oklch(0.65 0.18 145 / 50%)" strokeWidth="0.8" />
        {Array.from({ length: 5 }).map((_, i) => (
          <line key={i} x1={(i + 1) * 20} y1="2" x2={(i + 1) * 20} y2="42" stroke="oklch(0.65 0.18 145 / 30%)" strokeWidth="0.6" />
        ))}
        <line x1="2" y1="22" x2="118" y2="22" stroke="oklch(0.65 0.18 145 / 30%)" strokeWidth="0.6" />
      </g>
      {/* anemometer cups */}
      <g transform="translate(120 80)">
        <circle r="2.5" fill="oklch(0.82 0.20 145)" />
        {[0, 120, 240].map((deg) => (
          <g key={deg} transform={`rotate(${deg})`}>
            <line x1="0" y1="0" x2="18" y2="0" stroke="oklch(0.65 0.18 145 / 80%)" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="18" cy="0" r="4" fill="oklch(0.22 0.025 150)" stroke="oklch(0.82 0.20 145)" strokeWidth="1" />
          </g>
        ))}
        <animateTransform attributeName="transform" type="rotate" from="0 0 0" to="360 0 0" dur="6s" repeatCount="indefinite" additive="sum" />
      </g>
      {/* sensors */}
      <rect x="110" y="110" width="20" height="20" rx="3" fill="url(#ws-body)" stroke="oklch(0.65 0.18 145 / 60%)" strokeWidth="0.8" />
      <rect x="102" y="135" width="36" height="18" rx="3" fill="url(#ws-body)" stroke="oklch(0.65 0.18 145 / 60%)" strokeWidth="0.8" />
      <circle cx="120" cy="144" r="2" fill="oklch(0.82 0.20 145)">
        <animate attributeName="opacity" values="1;0.2;1" dur="1.8s" repeatCount="indefinite" />
      </circle>
      {/* ground */}
      <line x1="40" y1="162" x2="200" y2="162" stroke="oklch(0.30 0.025 150)" strokeWidth="1" strokeDasharray="3 6" />
    </svg>
  );
}

function WirelessModule() {
  return (
    <svg viewBox="0 0 240 180" className="h-auto w-full">
      <defs>
        <linearGradient id="wm-body" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="oklch(0.26 0.025 150)" />
          <stop offset="100%" stopColor="oklch(0.18 0.02 150)" />
        </linearGradient>
      </defs>
      {/* wifi arcs */}
      {[26, 36, 46].map((r, i) => (
        <path
          key={r}
          d={`M ${120 - r} 30 A ${r} ${r} 0 0 1 ${120 + r} 30`}
          fill="none"
          stroke="oklch(0.82 0.20 145)"
          strokeOpacity={0.6 - i * 0.18}
          strokeWidth="1.5"
          strokeLinecap="round"
        >
          <animate attributeName="stroke-opacity" values={`${0.3 - i * 0.08};${0.7 - i * 0.18};${0.3 - i * 0.08}`} dur="2s" begin={`${i * 0.25}s`} repeatCount="indefinite" />
        </path>
      ))}
      {/* module casing */}
      <rect x="60" y="60" width="120" height="80" rx="8" fill="url(#wm-body)" stroke="oklch(0.65 0.18 145 / 50%)" strokeWidth="0.8" />
      {/* display */}
      <rect x="72" y="72" width="48" height="28" rx="3" fill="oklch(0.12 0.02 150)" stroke="oklch(0.65 0.18 145 / 50%)" strokeWidth="0.6" />
      <text x="96" y="90" textAnchor="middle" fontFamily="Geist Mono, monospace" fontSize="9" fill="oklch(0.82 0.20 145)">24.8°C</text>
      {/* LEDs */}
      {[0, 1, 2, 3].map((i) => (
        <circle key={i} cx={138 + i * 12} cy="78" r="2.5" fill={i < 3 ? 'oklch(0.82 0.20 145)' : 'oklch(0.36 0.03 150)'}>
          {i < 3 && <animate attributeName="opacity" values="1;0.3;1" dur={`${1.4 + i * 0.3}s`} repeatCount="indefinite" />}
        </circle>
      ))}
      {/* relay ports */}
      {Array.from({ length: 8 }).map((_, i) => (
        <rect key={i} x={70 + i * 13} y="112" width="9" height="16" rx="1.5" fill="oklch(0.14 0.02 150)" stroke="oklch(0.38 0.03 150)" strokeWidth="0.4" />
      ))}
      {/* antenna */}
      <line x1="170" y1="60" x2="170" y2="40" stroke="oklch(0.82 0.20 145)" strokeWidth="2" strokeLinecap="round" />
      <circle cx="170" cy="38" r="2.5" fill="oklch(0.82 0.20 145)">
        <animate attributeName="r" values="2;4;2" dur="1.6s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

function Greenhouse() {
  return (
    <svg viewBox="0 0 240 180" className="h-auto w-full">
      <defs>
        <linearGradient id="gh-glass" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="oklch(0.700 0.180 145 / 18%)" />
          <stop offset="100%" stopColor="oklch(0.700 0.180 145 / 4%)" />
        </linearGradient>
        <linearGradient id="gh-frame" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="oklch(0.36 0.03 150)" />
          <stop offset="100%" stopColor="oklch(0.24 0.025 150)" />
        </linearGradient>
      </defs>
      {/* structure */}
      <path d="M 40 140 L 40 70 L 120 28 L 200 70 L 200 140 Z" fill="url(#gh-glass)" stroke="url(#gh-frame)" strokeWidth="2" strokeLinejoin="round" />
      {/* frame bars */}
      <line x1="40" y1="70" x2="200" y2="70" stroke="url(#gh-frame)" strokeWidth="1.5" />
      <line x1="80" y1="140" x2="80" y2="49" stroke="oklch(0.65 0.18 145 / 30%)" strokeWidth="0.8" />
      <line x1="120" y1="140" x2="120" y2="28" stroke="oklch(0.65 0.18 145 / 30%)" strokeWidth="0.8" />
      <line x1="160" y1="140" x2="160" y2="49" stroke="oklch(0.65 0.18 145 / 30%)" strokeWidth="0.8" />
      {/* plants */}
      {[60, 100, 140, 180].map((x, i) => (
        <g key={x} transform={`translate(${x} 140)`}>
          <ellipse cx="0" cy="-4" rx="10" ry="3" fill="oklch(0.22 0.025 150)" />
          <path d="M 0 -4 Q -6 -14 -2 -20 Q 4 -14 0 -4" fill="oklch(0.45 0.14 145)" opacity="0.9">
            <animateTransform attributeName="transform" type="rotate" values="-3;3;-3" dur={`${3 + i * 0.3}s`} repeatCount="indefinite" />
          </path>
          <path d="M 0 -4 Q 8 -12 5 -18" stroke="oklch(0.55 0.16 145)" strokeWidth="1" fill="none" />
          <circle cx="-6" cy="-14" r="1.5" fill="oklch(0.65 0.18 145)" />
        </g>
      ))}
      {/* LED strip */}
      <line x1="50" y1="62" x2="190" y2="62" stroke="oklch(0.82 0.20 145)" strokeWidth="2" strokeLinecap="round" opacity="0.9">
        <animate attributeName="opacity" values="0.6;1;0.6" dur="3s" repeatCount="indefinite" />
      </line>
      {/* sensor dot */}
      <circle cx="200" cy="70" r="3" fill="oklch(0.82 0.20 145)">
        <animate attributeName="r" values="2;5;2" dur="1.8s" repeatCount="indefinite" />
      </circle>
      {/* ground */}
      <line x1="30" y1="143" x2="210" y2="143" stroke="oklch(0.30 0.025 150)" strokeWidth="1" />
    </svg>
  );
}
