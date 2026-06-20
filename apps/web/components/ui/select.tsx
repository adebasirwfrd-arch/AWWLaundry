import { cn } from '@/lib/utils';
import { forwardRef, type SelectHTMLAttributes } from 'react';

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, options, id, ...props }, ref) => (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-brand-navy">
          {label}
        </label>
      )}
      <select
        ref={ref}
        id={id}
        className={cn(
          'flex h-11 w-full rounded-aww-md border border-aww-border bg-white px-4 py-2 text-brand-navy',
          'focus:border-rainbow-cyan focus:outline-none focus:ring-2 focus:ring-rainbow-cyan/30',
          className
        )}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  )
);
Select.displayName = 'Select';
