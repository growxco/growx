import { cn } from '@/lib/utils';

/**
 * Live status indicator. Optional `liveCheck` flag enables business-hour aware label.
 * Default: just renders the label as-is (used for static "Operação ativa" etc).
 */
export default function StatusDot({ label = 'Operação ativa', className, businessHour = false }) {
  let actualLabel = label;
  let muted = false;

  if (businessHour && typeof window !== 'undefined') {
    const now = new Date();
    // BR business hours: Mon–Fri 9-19, Sat 9-13
    const day = now.getDay();
    const hour = now.getHours();
    const inBiz =
      (day >= 1 && day <= 5 && hour >= 9 && hour < 19) ||
      (day === 6 && hour >= 9 && hour < 13);
    if (!inBiz) {
      actualLabel = label.replace(/agora|online|ativo|disponível/i, 'fora do horário');
      muted = true;
    }
  }

  return (
    <span className={cn('inline-flex items-center gap-2 text-xs font-medium', muted ? 'text-muted-foreground' : 'text-foreground/80', className)}>
      <span className="relative flex size-2">
        <span className={cn('absolute inset-0 rounded-full', muted ? 'bg-foreground/30' : 'bg-emerald opacity-60 pulse-dot')} />
        <span className={cn('relative size-2 rounded-full', muted ? 'bg-foreground/40' : 'bg-emerald-glow shadow-[0_0_12px_2px_oklch(0.78_0.20_145/60%)]')} />
      </span>
      {actualLabel}
    </span>
  );
}
