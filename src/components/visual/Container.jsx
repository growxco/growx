import { cn } from '@/lib/utils';

export default function Container({ as: Tag = 'div', narrow = false, className, children, ...rest }) {
  return (
    <Tag className={cn(narrow ? 'container-narrow' : 'container-x', className)} {...rest}>
      {children}
    </Tag>
  );
}
