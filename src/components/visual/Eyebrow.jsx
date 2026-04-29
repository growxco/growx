import { cn } from '@/lib/utils';

export default function Eyebrow({ icon: Icon, children, tone = 'emerald', className }) {
  const tones = {
    emerald: 'text-emerald-glow border-[oklch(0.700_0.180_145/35%)] bg-[oklch(0.700_0.180_145/10%)]',
    amber: 'text-[oklch(0.85_0.14_75)] border-[oklch(0.760_0.140_75/35%)] bg-[oklch(0.760_0.140_75/10%)]',
    neutral: 'text-muted-foreground border-white/10 bg-white/5',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-eyebrow',
        tones[tone],
        className,
      )}
    >
      {Icon && <Icon className="size-3.5" strokeWidth={2.25} />}
      {children}
    </span>
  );
}
