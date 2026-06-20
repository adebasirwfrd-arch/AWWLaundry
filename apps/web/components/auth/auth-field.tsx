import type { InputHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface AuthFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon?: ReactNode;
  error?: string;
  rightSlot?: ReactNode;
  suffix?: ReactNode;
}

export function AuthField({ label, icon, error, rightSlot, suffix, className, id, ...props }: AuthFieldProps) {
  const fieldId = id ?? label.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label htmlFor={fieldId} className="text-[11px] font-semibold uppercase tracking-wider text-brand-navy/45">
          {label}
        </label>
        {rightSlot}
      </div>
      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-navy/35">
            {icon}
          </span>
        )}
        <input
          id={fieldId}
          className={cn(
            'flex h-12 w-full rounded-xl border border-brand-navy/12 bg-white text-brand-navy',
            'placeholder:text-brand-navy/30 focus:border-[#5B6CFF] focus:outline-none focus:ring-2 focus:ring-[#5B6CFF]/20',
            icon ? 'pl-11' : 'pl-4',
            suffix ? 'pr-12' : 'pr-4',
            error && 'border-red-400 focus:ring-red-200',
            className
          )}
          {...props}
        />
        {suffix && (
          <span className="absolute right-2 top-1/2 -translate-y-1/2">{suffix}</span>
        )}
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}

export function AuthDivider({ label = 'Atau lanjut dengan' }: { label?: string }) {
  return (
    <div className="relative my-6">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-brand-navy/10" />
      </div>
      <div className="relative flex justify-center">
        <span className="bg-white px-3 text-[11px] font-semibold uppercase tracking-wider text-brand-navy/40">
          {label}
        </span>
      </div>
    </div>
  );
}

export function AuthCard({ children }: { children: ReactNode }) {
  return (
    <div className="w-full max-w-md rounded-2xl bg-white px-8 py-10 shadow-[0_8px_40px_rgba(30,58,110,0.08)] sm:px-10">
      {children}
    </div>
  );
}
