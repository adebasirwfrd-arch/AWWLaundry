import { cn } from '@/lib/utils';
import { forwardRef, type InputHTMLAttributes } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, ...props }, ref) => (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-brand-navy">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={id}
        className={cn(
          'flex h-11 w-full rounded-aww-md border border-aww-border bg-white px-4 py-2 text-brand-navy',
          'placeholder:text-aww-text-muted focus:border-rainbow-cyan focus:outline-none focus:ring-2 focus:ring-rainbow-cyan/30',
          'transition-all duration-200',
          error && 'border-red-500 focus:ring-red-500/30',
          className
        )}
        {...props}
      />
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  )
);
Input.displayName = 'Input';
