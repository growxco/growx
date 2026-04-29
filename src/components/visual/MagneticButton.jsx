import { useRef } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function MagneticButton({
  as: Tag = 'button',
  href,
  className,
  children,
  strength = 14,
  ...rest
}) {
  const ref = useRef(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 220, damping: 18, mass: 0.4 });
  const sy = useSpring(y, { stiffness: 220, damping: 18, mass: 0.4 });

  const handleMove = (e) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    x.set(((e.clientX - cx) / rect.width) * strength * 2);
    y.set(((e.clientY - cy) / rect.height) * strength * 2);
  };

  const handleLeave = () => {
    x.set(0);
    y.set(0);
  };

  const Component = href ? motion.a : motion[Tag] ?? motion.button;

  return (
    <Component
      ref={ref}
      href={href}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      style={{ x: sx, y: sy }}
      className={cn(className)}
      {...rest}
    >
      <motion.span style={{ x: sx, y: sy }} className="inline-flex items-center gap-2">
        {children}
      </motion.span>
    </Component>
  );
}
