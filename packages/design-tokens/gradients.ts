import { palette } from './colors';

export interface GradientStop {
  color: string;
  offset: number;
}

export interface GradientDefinition {
  id: string;
  name: string;
  description: string;
  angle: number;
  stops: GradientStop[];
  css: string;
}

function buildCss(angle: number, stops: GradientStop[]): string {
  const parts = stops
    .map((s) => `${s.color} ${Math.round(s.offset * 100)}%`)
    .join(', ');
  return `linear-gradient(${angle}deg, ${parts})`;
}

/** Pelangi penuh — seperti fluid di huruf AWW logo */
export const rainbowGradientStops: GradientStop[] = [
  { color: palette.rainbow.pink, offset: 0 },
  { color: palette.rainbow.orange, offset: 0.17 },
  { color: palette.rainbow.yellow, offset: 0.33 },
  { color: palette.rainbow.green, offset: 0.5 },
  { color: palette.rainbow.cyan, offset: 0.67 },
  { color: palette.rainbow.blue, offset: 0.83 },
  { color: palette.rainbow.purple, offset: 1 },
];

/** Gelembung iridescent — shimmer pelangi di permukaan bubble */
export const bubbleIridescentStops: GradientStop[] = [
  { color: 'rgba(255,255,255,0.9)', offset: 0 },
  { color: 'rgba(255,92,154,0.4)', offset: 0.2 },
  { color: 'rgba(78,205,196,0.5)', offset: 0.5 },
  { color: 'rgba(74,144,217,0.4)', offset: 0.8 },
  { color: 'rgba(255,255,255,0.7)', offset: 1 },
];

export const gradients = {
  /** Splash, login — cream + soft rainbow wash */
  brandHero: {
    id: 'brand-hero',
    name: 'Brand Hero',
    description: 'Background splash dengan wash pelangi halus',
    angle: 160,
    stops: [
      { color: palette.brand.cream, offset: 0 },
      { color: 'rgba(255,92,154,0.08)', offset: 0.25 },
      { color: 'rgba(78,205,196,0.12)', offset: 0.5 },
      { color: 'rgba(74,144,217,0.10)', offset: 0.75 },
      { color: 'rgba(155,89,182,0.06)', offset: 1 },
    ],
    css: buildCss(160, [
      { color: palette.brand.cream, offset: 0 },
      { color: 'rgba(255,92,154,0.08)', offset: 0.25 },
      { color: 'rgba(78,205,196,0.12)', offset: 0.5 },
      { color: 'rgba(74,144,217,0.10)', offset: 0.75 },
      { color: 'rgba(155,89,182,0.06)', offset: 1 },
    ]),
  } satisfies GradientDefinition,

  /** Pelangi penuh — progress bar, border aktif, highlight */
  rainbow: {
    id: 'rainbow',
    name: 'Rainbow Fluid',
    description: 'Gradient pelangi seperti huruf AWW di logo',
    angle: 135,
    stops: rainbowGradientStops,
    css: buildCss(135, rainbowGradientStops),
  } satisfies GradientDefinition,

  /** Header — navy brand + subtle rainbow edge */
  header: {
    id: 'header',
    name: 'Header',
    description: 'Navigation bar — navy dengan accent pelangi',
    angle: 135,
    stops: [
      { color: palette.brand.navy, offset: 0 },
      { color: '#2A4F8C', offset: 0.7 },
      { color: palette.rainbow.blue, offset: 1 },
    ],
    css: buildCss(135, [
      { color: palette.brand.navy, offset: 0 },
      { color: '#2A4F8C', offset: 0.7 },
      { color: palette.rainbow.blue, offset: 1 },
    ]),
  } satisfies GradientDefinition,

  /** Card — glass bubble effect */
  cardBubble: {
    id: 'card-bubble',
    name: 'Card Bubble',
    description: 'KPI card dengan efek gelembung',
    angle: 145,
    stops: [
      { color: 'rgba(255,255,255,0.95)', offset: 0 },
      { color: 'rgba(91,192,235,0.08)', offset: 1 },
    ],
    css: buildCss(145, [
      { color: 'rgba(255,255,255,0.95)', offset: 0 },
      { color: 'rgba(91,192,235,0.08)', offset: 1 },
    ]),
  } satisfies GradientDefinition,

  /** CTA — orange "DRY" dari logo */
  ctaPrimary: {
    id: 'cta-primary',
    name: 'CTA Primary',
    description: 'Tombol aksi — orange energik dari logo',
    angle: 135,
    stops: [
      { color: '#FF9F4D', offset: 0 },
      { color: palette.brand.orange, offset: 0.5 },
      { color: '#F57C00', offset: 1 },
    ],
    css: buildCss(135, [
      { color: '#FF9F4D', offset: 0 },
      { color: palette.brand.orange, offset: 0.5 },
      { color: '#F57C00', offset: 1 },
    ]),
  } satisfies GradientDefinition,

  /** Payment success — rainbow celebration */
  paymentSuccess: {
    id: 'payment-success',
    name: 'Payment Success',
    description: 'Toast pembayaran — gelembung pelangi',
    angle: 120,
    stops: [
      { color: palette.rainbow.green, offset: 0 },
      { color: palette.rainbow.cyan, offset: 0.4 },
      { color: palette.rainbow.pink, offset: 1 },
    ],
    css: buildCss(120, [
      { color: palette.rainbow.green, offset: 0 },
      { color: palette.rainbow.cyan, offset: 0.4 },
      { color: palette.rainbow.pink, offset: 1 },
    ]),
  } satisfies GradientDefinition,

  /** Order progress — rainbow flow */
  orderProgress: {
    id: 'order-progress',
    name: 'Order Progress',
    description: 'Progress cucian — alur pelangi',
    angle: 90,
    stops: rainbowGradientStops,
    css: buildCss(90, rainbowGradientStops),
  } satisfies GradientDefinition,

  /** Bubble iridescent — particle & overlay */
  bubbleShimmer: {
    id: 'bubble-shimmer',
    name: 'Bubble Shimmer',
    description: 'Permukaan gelembung iridescent',
    angle: 45,
    stops: bubbleIridescentStops,
    css: buildCss(45, bubbleIridescentStops),
  } satisfies GradientDefinition,

  troubleAlert: {
    id: 'trouble-alert',
    name: 'Trouble Alert',
    description: 'Alert mesin trouble',
    angle: 135,
    stops: [
      { color: '#FF7043', offset: 0 },
      { color: '#E53935', offset: 1 },
    ],
    css: buildCss(135, [
      { color: '#FF7043', offset: 0 },
      { color: '#E53935', offset: 1 },
    ]),
  } satisfies GradientDefinition,

  aiInsight: {
    id: 'ai-insight',
    name: 'AI Insight',
    description: 'Panel AI — purple to cyan',
    angle: 145,
    stops: [
      { color: palette.rainbow.purple, offset: 0 },
      { color: palette.rainbow.blue, offset: 0.5 },
      { color: palette.rainbow.cyan, offset: 1 },
    ],
    css: buildCss(145, [
      { color: palette.rainbow.purple, offset: 0 },
      { color: palette.rainbow.blue, offset: 0.5 },
      { color: palette.rainbow.cyan, offset: 1 },
    ]),
  } satisfies GradientDefinition,
} as const;

export type GradientId = keyof typeof gradients;
