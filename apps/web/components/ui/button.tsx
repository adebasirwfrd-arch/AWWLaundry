'use client';

import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { forwardRef, useRef, type ButtonHTMLAttributes } from 'react';
import gsap from 'gsap';

const buttonVariants = cva(
  'relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-xl font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rainbow-cyan focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-aww-cta text-white shadow-aww-glow-orange hover:brightness-110',
        rainbow: 'bg-aww-rainbow text-white shadow-aww-glow-rainbow hover:brightness-110',
        secondary: 'bg-brand-sky/15 text-brand-navy hover:bg-brand-sky/25 border border-brand-sky/20',
        outline:
          'border-2 border-brand-navy/15 bg-white/50 text-brand-navy backdrop-blur-sm hover:border-rainbow-cyan/50 hover:bg-white',
        ghost: 'text-rainbow-cyan hover:bg-rainbow-cyan/10',
        danger: 'bg-red-500 text-white hover:bg-red-600 shadow-sm',
      },
      size: {
        sm: 'h-9 px-4 text-sm',
        md: 'h-11 px-6 text-base',
        lg: 'h-13 px-8 text-lg',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  }
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, onClick, onMouseEnter, ...props }, ref) => {
    const localRef = useRef<HTMLButtonElement>(null);

    function setRefs(node: HTMLButtonElement) {
      localRef.current = node;
      if (typeof ref === 'function') ref(node);
      else if (ref) (ref as React.MutableRefObject<HTMLButtonElement | null>).current = node;
    }

    function handleEnter(e: React.MouseEvent<HTMLButtonElement>) {
      if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        gsap.to(localRef.current, { y: -2, scale: 1.03, duration: 0.25, ease: 'back.out(2)' });
      }
      onMouseEnter?.(e);
    }
    function handleLeave() {
      if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        gsap.to(localRef.current, { y: 0, scale: 1, duration: 0.3, ease: 'power2.out' });
      }
    }
    function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
      if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        gsap.fromTo(
          localRef.current,
          { scale: 0.94 },
          { scale: 1.03, duration: 0.45, ease: 'elastic.out(1, 0.4)' }
        );
      }
      onClick?.(e);
    }

    return (
      <button
        ref={setRefs}
        className={cn(buttonVariants({ variant, size, className }))}
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
        onClick={handleClick}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';
