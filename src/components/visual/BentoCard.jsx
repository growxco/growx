import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Premium bento-grid card.
 * Variants:
 *  - default: dark surface
 *  - emerald: emerald glass tint
 *  - feature: bigger card with image bg
 */
export default function BentoCard({
  to,
  href,
  className,
  variant = 'default',
  eyebrow,
  title,
  description,
  icon: Icon,
  image,
  imageAlign = 'bottom',
  cta = 'Conhecer',
  children,
  ...rest
}) {
  const isInternal = !!to;
  const isAnchor = !!href;
  const Wrapper = isInternal ? Link : isAnchor ? 'a' : 'div';
  const wrapperProps = isInternal ? { to } : isAnchor ? { href } : {};

  const variantCls = {
    default: 'surface lift hover:border-[oklch(0.700_0.180_145/45%)]',
    emerald: 'glass-emerald lift hover:shadow-glow-md',
    feature: 'surface-elevated lift hover:shadow-glow-lg',
  }[variant];

  return (
    <Wrapper
      {...wrapperProps}
      className={cn(
        'group relative overflow-hidden rounded-2xl',
        variantCls,
        (isInternal || isAnchor) && 'block cursor-pointer',
        className,
      )}
      {...rest}
    >
      {/* glow border on hover */}
      <div className="pointer-events-none absolute inset-0 rounded-2xl ring-hairline" />
      {(isInternal || isAnchor) && (
        <div className="pointer-events-none absolute right-4 top-4 z-10 rounded-full border border-white/10 bg-white/5 p-1.5 text-foreground/70 backdrop-blur opacity-0 transition-opacity group-hover:opacity-100">
          <ArrowUpRight className="size-3.5" />
        </div>
      )}

      <div className="relative z-[1] flex h-full flex-col gap-5 p-7 sm:p-8">
        {(eyebrow || Icon) && (
          <div className="flex items-center justify-between">
            {Icon && (
              <span className="inline-flex size-10 items-center justify-center rounded-xl bg-emerald/15 text-emerald-glow ring-hairline">
                <Icon className="size-5" />
              </span>
            )}
            {eyebrow && <span className="text-eyebrow text-muted-foreground">{eyebrow}</span>}
          </div>
        )}

        {title && (
          <h3 className="text-xl font-semibold leading-tight tracking-tight text-foreground sm:text-2xl">
            {title}
          </h3>
        )}
        {description && (
          <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">{description}</p>
        )}
        {children}

        {image && imageAlign === 'bottom' && (
          <div className="relative mt-auto -mb-7 -mx-7 sm:-mb-8 sm:-mx-8 mask-fade-bottom">
            <img src={image} alt="" loading="lazy" className="h-44 w-full object-cover sm:h-52" />
          </div>
        )}

        {(isInternal || isAnchor) && cta && (
          <div className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-glow">
            {cta}
            <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </div>
        )}
      </div>

      {image && imageAlign === 'background' && (
        <>
          <img
            src={image}
            alt=""
            loading="lazy"
            className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-30 transition-opacity duration-700 group-hover:opacity-40"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-background via-background/70 to-background/10" />
        </>
      )}
    </Wrapper>
  );
}
