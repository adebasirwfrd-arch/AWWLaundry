'use client';

/**
 * Transisi halaman — tanpa animasi (bubble/GSAP dihapus).
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  return <div data-page-transition-content>{children}</div>;
}
