import { cn } from '@/lib/utils';
import Container from './Container';
import Eyebrow from './Eyebrow';
import Reveal from './Reveal';

/**
 * Section primitive with optional eyebrow + heading + intro.
 * Layout-only; visual variations come from background/className.
 */
export default function Section({
  id,
  eyebrow,
  eyebrowIcon,
  title,
  intro,
  align = 'left', // 'left' | 'center'
  size = 'default', // 'default' | 'tight'
  narrow = false,
  className,
  containerClassName,
  headerClassName,
  children,
  background,
}) {
  const alignCls = align === 'center' ? 'text-center mx-auto' : '';
  const sizeCls = size === 'tight' ? 'section-y-tight' : 'section-y';

  return (
    <section id={id} className={cn('relative overflow-hidden', sizeCls, className)}>
      {background}
      <Container narrow={narrow} className={cn('relative', containerClassName)}>
        {(eyebrow || title || intro) && (
          <Reveal className={cn('mb-12 max-w-2xl', alignCls, headerClassName)}>
            {eyebrow && (
              <div className={cn('mb-5', align === 'center' && 'flex justify-center')}>
                <Eyebrow icon={eyebrowIcon}>{eyebrow}</Eyebrow>
              </div>
            )}
            {title && (
              <h2 className="text-display-lg text-foreground">{title}</h2>
            )}
            {intro && (
              <p className="mt-5 text-lg leading-relaxed text-muted-foreground sm:text-xl">{intro}</p>
            )}
          </Reveal>
        )}
        {children}
      </Container>
    </section>
  );
}
