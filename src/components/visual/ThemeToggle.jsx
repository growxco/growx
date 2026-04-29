import { Sun, Moon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from './ThemeProvider';
import { cn } from '@/lib/utils';

export default function ThemeToggle({ className }) {
  const { theme, toggle } = useTheme();
  const isDark = theme === 'dark';
  return (
    <button
      type="button"
      aria-label={isDark ? 'Mudar pra modo claro' : 'Mudar pra modo escuro'}
      onClick={toggle}
      className={cn(
        'inline-flex size-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-foreground/70 transition-all hover:border-emerald/40 hover:text-emerald-glow',
        className,
      )}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={theme}
          initial={{ rotate: -60, opacity: 0, scale: 0.6 }}
          animate={{ rotate: 0, opacity: 1, scale: 1 }}
          exit={{ rotate: 60, opacity: 0, scale: 0.6 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="inline-flex"
        >
          {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}
