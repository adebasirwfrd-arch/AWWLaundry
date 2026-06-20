'use client';

import Image from 'next/image';

/**
 * Logo brand AWW Laundry — statis, tanpa animasi bubble mengambang.
 */
export function AnimatedLogo({
  className = '',
  width = 280,
  height = 150,
  bubbles: _bubbles = false,
  priority = false,
}: {
  className?: string;
  width?: number;
  height?: number;
  bubbles?: boolean;
  priority?: boolean;
}) {
  return (
    <div className={`relative inline-block ${className}`}>
      <Image
        src="/brand/logo.png"
        alt="AWW Laundry"
        width={width}
        height={height}
        priority={priority}
        className="relative h-auto w-full object-contain drop-shadow-xl"
      />
    </div>
  );
}
