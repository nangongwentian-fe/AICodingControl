import { cn } from '@/lib/utils';
import { Icon } from '@iconify/react';

interface SpinnerProps {
  tip?: string;
  className?: string;
}

export function Spinner({ tip, className }: SpinnerProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 py-12', className)}>
      <Icon icon="svg-spinners:ring-resize" className="text-primary" width={32} height={32} />
      {tip && <span className="text-sm text-muted-foreground">{tip}</span>}
    </div>
  );
}
