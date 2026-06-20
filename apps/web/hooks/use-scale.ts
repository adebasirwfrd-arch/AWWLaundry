'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  isWebSerialSupported,
  scaleBridge,
  type ScaleConnectionState,
  type ScaleReading,
} from '@/lib/scale-bridge';

export function useScale(onStableWeight?: (kg: number) => void) {
  const [reading, setReading] = useState<ScaleReading | null>(null);
  const [state, setState] = useState<ScaleConnectionState>('disconnected');
  const [supported] = useState(isWebSerialSupported);

  useEffect(() => {
    return scaleBridge.subscribe((r, s) => {
      setReading(r);
      setState(s);
      if (r?.stable && onStableWeight) onStableWeight(r.weightKg);
    });
  }, [onStableWeight]);

  const connect = useCallback(async () => {
    await scaleBridge.connect();
  }, []);

  const disconnect = useCallback(async () => {
    await scaleBridge.disconnect();
  }, []);

  return { reading, state, supported, connect, disconnect };
}
