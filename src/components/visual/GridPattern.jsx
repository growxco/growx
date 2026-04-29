import { cn } from '@/lib/utils';

export default function GridPattern({ fine = false, mask = 'radial', className }) {
  const maskCls = {
    radial: 'mask-radial-fade',
    bottom: 'mask-fade-bottom',
    top: 'mask-fade-top',
    none: '',
  }[mask] ?? 'mask-radial-fade';
  return (
    <div
      aria-hidden
      className={cn(
        'pointer-events-none absolute inset-0 -z-10',
        fine ? 'bg-grid-fine' : 'bg-grid',
        maskCls,
        className,
      )}
    />
  );
}
