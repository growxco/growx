import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';

const EASE = [0.16, 1, 0.3, 1];

/**
 * Wraps Routes to animate route changes (subtle fade-up).
 */
export default function PageTransition({ children }) {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.45, ease: EASE }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
