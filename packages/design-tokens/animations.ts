/**
 * AWW Laundry — GSAP Animation Presets
 * Theme: Rainbow Bubbles — semua elemen bergerak seperti gelembung pelangi
 */

export const animationEasings = {
  bubbleFloat: 'sine.inOut',
  bubblePop: 'back.out(2)',
  bubbleBounce: 'elastic.out(1, 0.5)',
  rainbowFlow: 'none', // linear for gradient position
  slideUp: 'power3.out',
  slideDown: 'power2.in',
  staggerReveal: 'power2.out',
  wiggle: 'wiggle(8, { amplitude: 4 })',
} as const;

export const animationDurations = {
  instant: 0.15,
  fast: 0.3,
  normal: 0.5,
  slow: 0.8,
  bubbleCycle: 3.5,
  rainbowShift: 6,
  logoReveal: 1.2,
  pageTransition: 0.45,
} as const;

/** Konfigurasi gelembung pelangi — background particle system */
export interface RainbowBubbleConfig {
  id: string;
  size: { min: number; max: number };
  colors: string[];
  opacity: { min: number; max: number };
  float: { yRange: number; xRange: number; duration: number };
  shimmer: boolean;
}

export const rainbowBubblePresets: RainbowBubbleConfig[] = [
  {
    id: 'bubble-lg',
    size: { min: 48, max: 120 },
    colors: ['rgba(255,92,154,0.35)', 'rgba(78,205,196,0.40)', 'rgba(74,144,217,0.35)'],
    opacity: { min: 0.25, max: 0.55 },
    float: { yRange: 40, xRange: 20, duration: 4.5 },
    shimmer: true,
  },
  {
    id: 'bubble-md',
    size: { min: 20, max: 48 },
    colors: ['rgba(255,210,63,0.30)', 'rgba(107,203,119,0.35)', 'rgba(155,89,182,0.30)'],
    opacity: { min: 0.20, max: 0.45 },
    float: { yRange: 25, xRange: 15, duration: 3.2 },
    shimmer: true,
  },
  {
    id: 'bubble-sm',
    size: { min: 8, max: 20 },
    colors: ['rgba(255,255,255,0.70)', 'rgba(91,192,235,0.40)'],
    opacity: { min: 0.30, max: 0.60 },
    float: { yRange: 15, xRange: 10, duration: 2.8 },
    shimmer: false,
  },
];

/** GSAP timeline sequence — page load standard */
export const pageLoadSequence = {
  logo: { from: { scale: 0.6, opacity: 0 }, to: { scale: 1, opacity: 1, duration: 1.2, ease: 'back.out(1.7)' } },
  bubbles: { stagger: 0.08, from: { scale: 0, opacity: 0 }, to: { scale: 1, opacity: 1, duration: 0.6, ease: 'back.out(2)' } },
  content: { stagger: 0.06, from: { y: 30, opacity: 0 }, to: { y: 0, opacity: 1, duration: 0.5, ease: 'power3.out' }, delay: 0.4 },
  rainbowBorder: { from: { backgroundPosition: '0% 50%' }, to: { backgroundPosition: '200% 50%', duration: 6, repeat: -1, ease: 'none' } },
} as const;

/** Lottie asset registry */
export const lottieAssets = {
  logoReveal: {
    file: 'logo-reveal.json',
    source: 'Convert dari assets/brand/aww-laundry-logo.png',
    description: 'Logo AWW muncul dengan gelembung pelangi mengelilingi',
    loop: false,
    autoplay: true,
    duration: '1.5s',
  },
  bubbleFloat: {
    file: 'bubble-float-loop.json',
    description: 'Gelembung pelangi floating infinite — background semua halaman auth',
    loop: true,
    autoplay: true,
  },
  waterDropletMascot: {
    file: 'water-droplet-mascot.json',
    source: 'Karakter tetesan air berkacamata dari logo (kiri)',
    description: 'Maskot berlari/melambai — loading & empty state',
    loop: true,
  },
  washingMachineWink: {
    file: 'washing-machine-wink.json',
    source: 'Mesin cuci di huruf W logo',
    description: 'Berkedip + lidah — status "sedang cuci"',
    loop: true,
  },
  rainbowArc: {
    file: 'rainbow-arc.json',
    source: 'Pelangi di atas logo',
    description: 'Pelangi pulse halus — splash screen header',
    loop: true,
  },
  washing: { file: 'washing-bubbles.json', description: 'Cuci — gelembung sabun pelangi', loop: true },
  ironing: { file: 'ironing-sparkle.json', description: 'Setrika — sparkle pelangi', loop: true },
  folding: { file: 'folding-clothes.json', description: 'Lipat — baju + gelembung', loop: true },
  paymentSuccess: {
    file: 'payment-rainbow-burst.json',
    description: 'Pembayaran masuk — gelembung pelangi meledak + confetti',
    loop: false,
  },
  loading: { file: 'bubble-spinner.json', description: 'Spinner gelembung pelangi berputar', loop: true },
  emptyState: { file: 'floating-bubbles-empty.json', description: 'Tidak ada data — gelembung mengambang', loop: true },
} as const;

export type LottieAssetId = keyof typeof lottieAssets;
