/**
 * AWW Laundry — Color Tokens (derived from official logo)
 * Logo: assets/brand/aww-laundry-logo.png
 * Theme: Rainbow Bubbles — FRESH • CLEAN • FUN
 */

export const palette = {
  /** Warna inti dari logo AWW Laundry */
  brand: {
    // "Tinta" utama — pakai CSS variable agar otomatis flip saat dark mode
    // (mencakup semua varian opacity: text-brand-navy/55, border-brand-navy/10, dll).
    navy: 'rgb(var(--c-brand-navy) / <alpha-value>)',
    orange: '#FF8C2A',     // "DRY" — CTA utama
    pink: '#FF5C9A',       // "FRESH", sparkle, rainbow arc
    sky: '#5BC0EB',        // water splash, "FRANCHISE"
    cream: '#FAFAF8',      // background logo & app
    white: '#FFFFFF',
    charcoal: '#2C3E50',   // text body
  },

  /** Spektrum pelangi — gelembung & gradient fluid (huruf AWW) */
  rainbow: {
    pink: '#FF5C9A',
    orange: '#FF8C2A',
    yellow: '#FFD23F',
    green: '#6BCB77',
    cyan: '#4ECDC4',
    blue: '#4A90D9',
    purple: '#9B59B6',
  },

  /** Gelembung — translusi untuk overlay & particle */
  bubble: {
    white: 'rgba(255, 255, 255, 0.65)',
    pink: 'rgba(255, 92, 154, 0.35)',
    cyan: 'rgba(78, 205, 196, 0.40)',
    blue: 'rgba(74, 144, 217, 0.35)',
    shimmer: 'rgba(255, 255, 255, 0.85)',
  },

  /** Legacy aliases — backward compatible */
  fresh: {
    50: '#FAFAF8',
    100: '#E8F6FC',
    200: '#B8E8F5',
    300: '#4ECDC4',
    400: '#4A90D9',
    500: '#3A7BC8',
    600: '#1E3A6E',
    700: '#172E55',
    800: '#0F1F3D',
  },

  warm: {
    50: '#FFFAF5',
    100: '#FFF0E0',
    200: '#FFD9B3',
    300: '#FFB366',
    400: '#FF8C2A',
    500: '#F57C00',
    600: '#E65100',
    700: '#BF360C',
  },
} as const;

/** Semantic tokens */
export const semantic = {
  light: {
    background: palette.brand.cream,
    backgroundAlt: '#F5F9FF',
    surface: palette.brand.white,
    surfaceMuted: 'rgba(91, 192, 235, 0.12)',
    surfaceWarm: 'rgba(255, 140, 42, 0.08)',

    text: {
      primary: palette.brand.navy,
      secondary: '#3D5A80',
      muted: '#7A9BB8',
      inverse: palette.brand.white,
      onPrimary: palette.brand.white,
      onAccent: palette.brand.white,
      tagline: palette.rainbow.pink,
    },

    border: {
      default: 'rgba(30, 58, 110, 0.12)',
      muted: 'rgba(91, 192, 235, 0.25)',
      focus: palette.rainbow.cyan,
      rainbow: `linear-gradient(90deg, ${palette.rainbow.pink}, ${palette.rainbow.orange}, ${palette.rainbow.yellow}, ${palette.rainbow.green}, ${palette.rainbow.cyan}, ${palette.rainbow.blue}, ${palette.rainbow.purple})`,
    },

    brand: {
      primary: palette.brand.navy,
      primaryHover: '#2A4F8C',
      primaryMuted: 'rgba(30, 58, 110, 0.08)',
      accent: palette.brand.orange,
      accentHover: '#FF9F4D',
      accentMuted: 'rgba(255, 140, 42, 0.12)',
      fun: palette.rainbow.pink,
      water: palette.brand.sky,
    },

    status: {
      success: palette.rainbow.green,
      successBg: 'rgba(107, 203, 119, 0.15)',
      warning: palette.rainbow.yellow,
      warningBg: 'rgba(255, 210, 63, 0.15)',
      error: '#E53935',
      errorBg: 'rgba(229, 57, 53, 0.10)',
      info: palette.rainbow.cyan,
      infoBg: 'rgba(78, 205, 196, 0.12)',
    },

    order: {
      received: palette.rainbow.cyan,
      washing: palette.rainbow.blue,
      drying: palette.rainbow.purple,
      ironing: palette.rainbow.orange,
      folding: palette.rainbow.yellow,
      ready: palette.rainbow.green,
      pickedUp: palette.brand.navy,
      trouble: '#E53935',
    },

    payment: {
      cash: palette.brand.navy,
      qris: '#1A1A2E',
      gopay: '#00AED6',
      shopeepay: '#EE4D2D',
      transfer: palette.rainbow.blue,
    },
  },

  dark: {
    background: '#0F1F3D',
    backgroundAlt: '#172E55',
    surface: '#1E3A6E',
    surfaceMuted: 'rgba(91, 192, 235, 0.15)',
    surfaceWarm: 'rgba(255, 140, 42, 0.10)',

    text: {
      primary: palette.brand.cream,
      secondary: '#B8D4E8',
      muted: '#7A9BB8',
      inverse: palette.brand.navy,
      onPrimary: palette.brand.white,
      onAccent: palette.brand.white,
      tagline: palette.rainbow.pink,
    },

    border: {
      default: 'rgba(91, 192, 235, 0.20)',
      muted: 'rgba(255, 255, 255, 0.10)',
      focus: palette.rainbow.cyan,
      rainbow: `linear-gradient(90deg, ${palette.rainbow.pink}, ${palette.rainbow.orange}, ${palette.rainbow.cyan}, ${palette.rainbow.purple})`,
    },

    brand: {
      primary: palette.rainbow.cyan,
      primaryHover: '#6EDDD6',
      primaryMuted: 'rgba(78, 205, 196, 0.15)',
      accent: palette.brand.orange,
      accentHover: '#FF9F4D',
      accentMuted: 'rgba(255, 140, 42, 0.15)',
      fun: palette.rainbow.pink,
      water: palette.brand.sky,
    },

    status: {
      success: '#81C784',
      successBg: 'rgba(107, 203, 119, 0.20)',
      warning: '#FFD54F',
      warningBg: 'rgba(255, 210, 63, 0.15)',
      error: '#EF5350',
      errorBg: 'rgba(229, 57, 53, 0.15)',
      info: palette.rainbow.cyan,
      infoBg: 'rgba(78, 205, 196, 0.15)',
    },

    order: {
      received: palette.rainbow.cyan,
      washing: palette.rainbow.blue,
      drying: palette.rainbow.purple,
      ironing: palette.rainbow.orange,
      folding: palette.rainbow.yellow,
      ready: '#81C784',
      pickedUp: palette.brand.cream,
      trouble: '#EF5350',
    },

    payment: {
      cash: palette.rainbow.cyan,
      qris: '#E8E8F0',
      gopay: '#00AED6',
      shopeepay: '#EE4D2D',
      transfer: palette.rainbow.blue,
    },
  },
} as const;

export type ColorMode = keyof typeof semantic;
