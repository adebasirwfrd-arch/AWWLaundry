'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';

interface AnimatedCounterProps {
  value: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  duration?: number;
}

export function AnimatedCounter({
  value,
  prefix = '',
  suffix = '',
  className = '',
  duration = 1.2,
}: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const obj = { val: 0 };
    const ctx = gsap.context(() => {
      gsap.to(obj, {
        val: value,
        duration,
        ease: 'power2.out',
        onUpdate: () => {
          el.textContent = `${prefix}${Math.round(obj.val).toLocaleString('id-ID')}${suffix}`;
        },
      });
    });

    return () => ctx.revert();
  }, [value, prefix, suffix, duration]);

  return <span ref={ref} className={className}>{prefix}0{suffix}</span>;
}
