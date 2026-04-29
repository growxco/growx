import { cn } from '@/lib/utils';

export default function Marquee({ children, className, fade = true, speed = 'normal' }) {
  const dur = { slow: '50s', normal: '32s', fast: '20s' }[speed] ?? '32s';
  return (
    <div
      className={cn(
        'relative w-full overflow-hidden',
        fade && '[mask-image:linear-gradient(to_right,transparent,black_15%,black_85%,transparent)]',
        className,
      )}
    >
      <div className="flex w-max marquee-track gap-12" style={{ animationDuration: dur }}>
        <div className="flex shrink-0 items-center gap-12">{children}</div>
        <div className="flex shrink-0 items-center gap-12" aria-hidden>
          {children}
        </div>
      </div>
    </div>
  );
}
