import { useEffect, useRef, useState } from 'react';
import { useInView, useMotionValue, useSpring } from 'framer-motion';

export default function Counter({ to = 100, suffix = '', prefix = '', decimals = 0 }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const motionVal = useMotionValue(0);
  const spring = useSpring(motionVal, { stiffness: 80, damping: 20, mass: 0.8 });
  const [display, setDisplay] = useState('0');

  useEffect(() => {
    if (inView) {
      motionVal.set(to);
    }
  }, [inView, to, motionVal]);

  useEffect(() => {
    return spring.on('change', (v) => {
      setDisplay(v.toFixed(decimals));
    });
  }, [spring, decimals]);

  return (
    <span ref={ref}>
      {prefix}{display}{suffix}
    </span>
  );
}
