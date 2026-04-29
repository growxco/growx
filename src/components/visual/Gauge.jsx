import { motion } from 'framer-motion';

/**
 * Compact half-circle gauge for HUD live values.
 */
export default function Gauge({ label, value = 70, suffix = '%', size = 100 }) {
  const r = size / 2 - 8;
  const c = Math.PI * r;
  const offset = c - (value / 100) * c;

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size / 2 + 8} viewBox={`0 0 ${size} ${size / 2 + 8}`}>
        <defs>
          <linearGradient id={`g-${label}`} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="oklch(0.65 0.18 145)" />
            <stop offset="100%" stopColor="oklch(0.82 0.20 145)" />
          </linearGradient>
        </defs>
        <path
          d={`M 8 ${size / 2} A ${r} ${r} 0 0 1 ${size - 8} ${size / 2}`}
          fill="none"
          stroke="oklch(1 0 0 / 8%)"
          strokeWidth="6"
          strokeLinecap="round"
        />
        <motion.path
          d={`M 8 ${size / 2} A ${r} ${r} 0 0 1 ${size - 8} ${size / 2}`}
          fill="none"
          stroke={`url(#g-${label})`}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          whileInView={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          viewport={{ once: true }}
        />
      </svg>
      <div className="-mt-3 flex items-baseline gap-0.5 font-mono">
        <span className="text-base font-semibold text-emerald-glow">{value}</span>
        <span className="text-xs text-muted-foreground">{suffix}</span>
      </div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}
