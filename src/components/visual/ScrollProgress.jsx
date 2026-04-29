import { motion, useScroll, useSpring } from 'framer-motion';

export default function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 110, damping: 30, mass: 0.4 });
  return (
    <motion.div
      style={{ scaleX }}
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-[55] h-[2px] origin-left bg-gradient-to-r from-emerald via-emerald-glow to-[oklch(0.85_0.14_75)]"
    />
  );
}
