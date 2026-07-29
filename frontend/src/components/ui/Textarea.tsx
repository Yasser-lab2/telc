import type { TextareaHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        'w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20',
        className,
      )}
      {...props}
    />
  );
}
