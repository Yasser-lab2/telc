import type { ButtonHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
};

export function Button({ className, variant = 'primary', ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex min-h-11 items-center justify-center rounded-xl px-5 py-2 text-sm font-extrabold transition disabled:cursor-not-allowed disabled:opacity-60',
        variant === 'primary' && 'bg-accent text-white hover:bg-accentDark',
        variant === 'secondary' && 'border border-border bg-surface text-text hover:border-accent/40 hover:bg-white',
        variant === 'ghost' && 'text-text hover:bg-surface',
        variant === 'danger' && 'bg-red-600 text-white hover:bg-red-700',
        className,
      )}
      {...props}
    />
  );
}
