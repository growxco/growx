import { cn } from '@/lib/utils';

export default function GradientText({ as: Tag = 'span', variant = 'emerald', className, children, ...rest }) {
  const cls = variant === 'warm' ? 'text-gradient-warm' : 'text-gradient-emerald';
  return (
    <Tag className={cn(cls, className)} {...rest}>
      {children}
    </Tag>
  );
}
