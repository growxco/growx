import { useEffect, useRef, useState } from 'react';
import { useInView, useMotionValue, useSpring } from 'framer-motion';
import { Users } from 'lucide-react';

/**
 * Live-feeling waitlist counter. Base + small jitter (no lie — reads from prop).
 * Props:
 *   - base (number) — actual current count (override via env or prop in production)
 *   - label
 */
export default function WaitlistCounter({ base = 412, label = 'pessoas já na lista de espera' }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  const motionVal = useMotionValue(0);
  const spring = useSpring(motionVal, { stiffness: 60, damping: 16, mass: 0.8 });
  const [n, setN] = useState(0);

  useEffect(() => {
    if (inView) motionVal.set(base);
  }, [inView, base, motionVal]);

  useEffect(() => spring.on('change', (v) => setN(Math.round(v))), [spring]);

  return (
    <div ref={ref} className="inline-flex items-center gap-3 rounded-2xl glass px-5 py-3 ring-hairline">
      <span className="inline-flex size-9 items-center justify-center rounded-xl bg-emerald/15 text-emerald-glow ring-hairline">
        <Users className="size-4" />
      </span>
      <div className="leading-tight">
        <div className="font-display text-2xl font-bold text-foreground tabular-nums">{n.toLocaleString('pt-BR')}</div>
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}
