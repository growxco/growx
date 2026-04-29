import { cn } from '@/lib/utils';

/**
 * Topographic background (subtle SVG contour lines).
 * Atmosphere: campo + mapa técnico.
 */
export default function Topo({ className, opacity = 0.18 }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 1200 600"
      preserveAspectRatio="none"
      className={cn('pointer-events-none absolute inset-0 -z-10 h-full w-full', className)}
      style={{ opacity }}
    >
      <defs>
        <radialGradient id="topo-fade" cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor="white" stopOpacity="1" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </radialGradient>
        <mask id="topo-mask">
          <rect width="1200" height="600" fill="url(#topo-fade)" />
        </mask>
      </defs>
      <g
        mask="url(#topo-mask)"
        fill="none"
        stroke="oklch(0.700 0.180 145 / 60%)"
        strokeWidth="1"
      >
        {Array.from({ length: 14 }).map((_, i) => {
          const r = 80 + i * 60;
          return (
            <ellipse
              key={i}
              cx="600"
              cy="320"
              rx={r}
              ry={r * 0.55}
              transform={`rotate(${(i % 2) * 4 - 2} 600 320)`}
            />
          );
        })}
      </g>
    </svg>
  );
}
