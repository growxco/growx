import { cn } from '@/lib/utils';

export default function GlassCard({
  variant = 'default',
  as: Tag = 'div',
  className,
  children,
  ...rest
}) {
  const v = {
    default: 'glass',
    strong: 'glass-strong',
    emerald: 'glass-emerald',
    surface: 'surface',
    elevated: 'surface-elevated',
  }[variant] ?? 'glass';

  return (
    <Tag className={cn('relative rounded-2xl', v, className)} {...rest}>
      {children}
    </Tag>
  );
}
