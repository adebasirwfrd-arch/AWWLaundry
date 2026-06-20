'use client';

import { useEffect, useState } from 'react';
import Lottie from 'lottie-react';
import { WashingMachine } from '@/components/brand/washing-machine';

const LOTTIE_URL = 'https://assets2.lottiefiles.com/packages/lf20_touohxv0.json';

export function WashLottieHero({ className = 'h-20 w-20' }: { className?: string }) {
  const [animationData, setAnimationData] = useState<object | null>(null);

  useEffect(() => {
    fetch(LOTTIE_URL)
      .then((r) => r.json())
      .then(setAnimationData)
      .catch(() => setAnimationData(null));
  }, []);

  if (!animationData) {
    return <WashingMachine className={className} />;
  }

  return <Lottie animationData={animationData} loop className={className} />;
}
