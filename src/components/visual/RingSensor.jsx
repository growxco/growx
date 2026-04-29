import { motion } from 'framer-motion';

/**
 * Animated sensor ring (orbits + center pulse). Pure SVG.
 */
export default function RingSensor({ size = 380 }) {
  const cx = size / 2;
  const orbits = [0.42, 0.6, 0.78, 0.95];
  const dots = [
    { r: 0.42, deg: 30 },
    { r: 0.6, deg: 100 },
    { r: 0.6, deg: 220 },
    { r: 0.78, deg: 60 },
    { r: 0.78, deg: 200 },
    { r: 0.78, deg: 320 },
    { r: 0.95, deg: 0 },
    { r: 0.95, deg: 90 },
    { r: 0.95, deg: 180 },
    { r: 0.95, deg: 270 },
  ];

  const radius = (factor) => (size / 2 - 10) * factor;
  const polar = (factor, deg) => {
    const rad = ((deg - 90) * Math.PI) / 180;
    return [cx + radius(factor) * Math.cos(rad), cx + radius(factor) * Math.sin(rad)];
  };

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} aria-hidden className="max-w-full">
      <defs>
        <radialGradient id="ring-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="oklch(0.82 0.20 145)" stopOpacity="0.55" />
          <stop offset="60%" stopColor="oklch(0.82 0.20 145)" stopOpacity="0.05" />
          <stop offset="100%" stopColor="oklch(0.82 0.20 145)" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="ring-stroke" x1="0" x2="1">
          <stop offset="0%" stopColor="oklch(0.65 0.18 145 / 60%)" />
          <stop offset="100%" stopColor="oklch(0.82 0.20 145 / 30%)" />
        </linearGradient>
      </defs>

      <circle cx={cx} cy={cx} r={size / 2 - 6} fill="url(#ring-glow)" />

      {orbits.map((o, i) => (
        <motion.circle
          key={i}
          cx={cx}
          cy={cx}
          r={radius(o)}
          fill="none"
          stroke="url(#ring-stroke)"
          strokeWidth="1"
          strokeDasharray={i % 2 ? '2 6' : 'none'}
          initial={{ rotate: 0 }}
          animate={{ rotate: i % 2 === 0 ? 360 : -360 }}
          transition={{ duration: 30 + i * 12, repeat: Infinity, ease: 'linear' }}
          style={{ transformOrigin: `${cx}px ${cx}px` }}
        />
      ))}

      {dots.map((d, i) => {
        const [x, y] = polar(d.r, d.deg);
        return (
          <g key={i}>
            <circle cx={x} cy={y} r="3" fill="oklch(0.82 0.20 145)" />
            <circle cx={x} cy={y} r="6" fill="oklch(0.82 0.20 145)" opacity="0.3">
              <animate attributeName="r" values="3;10;3" dur={`${2 + i * 0.2}s`} repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.4;0;0.4" dur={`${2 + i * 0.2}s`} repeatCount="indefinite" />
            </circle>
          </g>
        );
      })}

      {/* center hub */}
      <circle cx={cx} cy={cx} r="36" fill="oklch(0.18 0.022 150)" stroke="oklch(0.65 0.18 145 / 60%)" strokeWidth="1" />
      <circle cx={cx} cy={cx} r="22" fill="oklch(0.700 0.180 145 / 12%)" stroke="oklch(0.700 0.180 145 / 50%)" strokeWidth="1" />
      <text x={cx} y={cx + 5} textAnchor="middle" fontFamily="Geist Mono, monospace" fontSize="11" fill="oklch(0.82 0.20 145)" fontWeight="600">
        CORE
      </text>
    </svg>
  );
}
