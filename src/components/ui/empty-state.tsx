import { cn } from '@/lib/utils';
import { Icon } from '@iconify/react';

interface EmptyStateProps {
  description?: string;
  className?: string;
  children?: React.ReactNode;
}

export function EmptyState({ description, className, children }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 py-16', className)}>
      <Icon icon="mdi:package-variant" className="text-muted-foreground/40" width={48} height={48} />
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
      {children}
    </div>
  );
}
