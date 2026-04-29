import { cn } from '@/lib/utils';

export default function Aurora({ intensity = 'md', className, animated = true }) {
  const opacity = {
    sm: 'opacity-40',
    md: 'opacity-60',
    lg: 'opacity-90',
  }[intensity] ?? 'opacity-60';

  return (
    <div
      aria-hidden
      className={cn(
        'pointer-events-none absolute inset-0 -z-10 overflow-hidden',
        className,
      )}
    >
      <div
        className={cn(
          'absolute -top-1/3 left-1/2 h-[120%] w-[140%] -translate-x-1/2 bg-aurora',
          opacity,
          animated && 'aurora-anim',
        )}
      />
      <div className="absolute inset-0 bg-grid mask-radial-fade opacity-50" />
    </div>
  );
}
