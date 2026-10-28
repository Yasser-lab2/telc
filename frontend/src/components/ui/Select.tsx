import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { cn } from '../../lib/utils';

export type SelectOption = { value: string; label: ReactNode };

type SelectProps = {
  value: string;
  options: SelectOption[];
  onValueChange: (value: string) => void;
  ariaLabel: string;
  direction?: 'ltr' | 'rtl';
  className?: string;
};

export function Select({ value, options, onValueChange, ariaLabel, direction = 'ltr', className }: SelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const listboxId = useId();
  const selectedIndex = Math.max(0, options.findIndex((option) => option.value === value));
  const selected = options[selectedIndex];

  useEffect(() => {
    if (!open) return;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', closeOnOutsidePointer);
    return () => document.removeEventListener('pointerdown', closeOnOutsidePointer);
  }, [open]);

  function choose(nextValue: string) {
    onValueChange(nextValue);
    setOpen(false);
    triggerRef.current?.focus();
  }

  function focusOption(index: number) {
    const nextIndex = (index + options.length) % options.length;
    optionRefs.current[nextIndex]?.focus();
  }

  function handleTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setOpen(true);
      window.setTimeout(() => focusOption(event.key === 'ArrowUp' ? selectedIndex - 1 : selectedIndex), 0);
    }
  }

  function handleOptionKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      focusOption(index + 1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      focusOption(index - 1);
    } else if (event.key === 'Home') {
      event.preventDefault();
      focusOption(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      focusOption(options.length - 1);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    }
  }

  return (
    <div ref={rootRef} className={cn('relative', className)} dir={direction}>
      <button
        ref={triggerRef}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={handleTriggerKeyDown}
        className="inline-flex min-h-10 min-w-28 items-center justify-between gap-3 rounded-xl border border-border bg-surface px-3 py-2 text-xs font-bold text-ink shadow-sm transition hover:border-accent/50 focus-visible:border-accent"
      >
        <span className="truncate">{selected?.label ?? value}</span>
        <svg aria-hidden="true" className={cn('h-3.5 w-3.5 shrink-0 transition-transform', open && 'rotate-180')} viewBox="0 0 20 20" fill="none">
          <path d="m5 7.5 5 5 5-5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
        </svg>
      </button>
      {open && (
        <div id={listboxId} role="listbox" aria-label={ariaLabel} className="absolute end-0 top-full z-50 mt-2 min-w-full overflow-hidden rounded-xl border border-border bg-surface p-1 text-ink shadow-xl">
          {options.map((option, index) => (
            <button
              key={option.value}
              ref={(element) => { optionRefs.current[index] = element; }}
              type="button"
              role="option"
              aria-selected={option.value === value}
              onClick={() => choose(option.value)}
              onKeyDown={(event) => handleOptionKeyDown(event, index)}
              className={cn(
                'flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-start text-xs font-bold transition hover:bg-accentSoft hover:text-accentDark focus-visible:bg-accentSoft',
                option.value === value && 'bg-accentSoft text-accentDark',
              )}
            >
              <span>{option.label}</span>
              {option.value === value && <span aria-hidden="true">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
