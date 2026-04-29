import { motion } from 'framer-motion';

const EASE = [0.16, 1, 0.3, 1];

export default function Reveal({
  children,
  delay = 0,
  y = 24,
  duration = 0.7,
  once = true,
  amount = 0.3,
  as = 'div',
  className,
  ...rest
}) {
  const Tag = motion[as] ?? motion.div;
  return (
    <Tag
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration, ease: EASE, delay }}
      viewport={{ once, amount }}
      className={className}
      {...rest}
    >
      {children}
    </Tag>
  );
}
