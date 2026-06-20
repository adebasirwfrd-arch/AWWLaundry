'use client';

import { useEffect } from 'react';

/** Animasi bubble perayaan dinonaktifkan — hanya bubble klik yang aktif. */
export function CelebrationBurst({
  show,
  onDone,
}: {
  show?: boolean;
  title?: string;
  subtitle?: string;
  onDone?: () => void;
}) {
  useEffect(() => {
    if (!show) return;
    onDone?.();
  }, [show, onDone]);

  return null;
}
