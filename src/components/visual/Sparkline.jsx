import { useEffect, useMemo, useState } from 'react';

/**
 * Live sparkline auto-evolving SVG. Verde-glow.
 */
export default function Sparkline({
  width = 220,
  height = 56,
  initial,
  speed = 1800,
  variation = 12,
  trend = 'up',
  className,
}) {
  const [points, setPoints] = useState(() =>
    initial ?? Array.from({ length: 28 }, (_, i) => 50 + Math.sin(i / 2) * 8 + Math.random() * 6),
  );

  useEffect(() => {
    const id = setInterval(() => {
      setPoints((prev) => {
        const last = prev[prev.length - 1];
        const drift = trend === 'up' ? 0.6 : trend === 'down' ? -0.6 : 0;
        const next = Math.max(8, Math.min(92, last + drift + (Math.random() - 0.5) * variation));
        return [...prev.slice(1), next];
      });
    }, speed);
    return () => clearInterval(id);
  }, [speed, variation, trend]);

  const { path, area, lastX, lastY } = useMemo(() => {
    const max = Math.max(...points);
    const min = Math.min(...points);
    const range = max - min || 1;
    const stepX = width / (points.length - 1);

    const coords = points.map((p, i) => {
      const x = i * stepX;
      const y = height - ((p - min) / range) * (height - 8) - 4;
      return [x, y];
    });

    let p = `M ${coords[0][0]} ${coords[0][1]}`;
    for (let i = 1; i < coords.length; i++) {
      const [x, y] = coords[i];
      const [px, py] = coords[i - 1];
      const cx = (px + x) / 2;
      p += ` Q ${cx} ${py}, ${cx} ${(py + y) / 2} T ${x} ${y}`;
    }

    const a = `${p} L ${width} ${height} L 0 ${height} Z`;
    const [lx, ly] = coords[coords.length - 1];
    return { path: p, area: a, lastX: lx, lastY: ly };
  }, [points, width, height]);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} className={className} aria-hidden>
      <defs>
        <linearGradient id="spark-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="oklch(0.78 0.20 145)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="oklch(0.78 0.20 145)" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="spark-line" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="oklch(0.65 0.18 145)" />
          <stop offset="100%" stopColor="oklch(0.82 0.20 145)" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#spark-fill)" />
      <path d={path} fill="none" stroke="url(#spark-line)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lastX} cy={lastY} r="3" fill="oklch(0.82 0.20 145)" />
      <circle cx={lastX} cy={lastY} r="6" fill="oklch(0.82 0.20 145)" opacity="0.25">
        <animate attributeName="r" values="3;9;3" dur="1.6s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.4;0;0.4" dur="1.6s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}
