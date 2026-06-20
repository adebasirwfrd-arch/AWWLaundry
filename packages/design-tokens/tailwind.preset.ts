import type { Config } from 'tailwindcss';
import { palette } from './colors';

const preset: Partial<Config> = {
  theme: {
    extend: {
      colors: {
        brand: { ...palette.brand },
        rainbow: { ...palette.rainbow },
        fresh: { ...palette.fresh },
        warm: { ...palette.warm },
        aww: {
          background: 'var(--aww-background)',
          'background-alt': 'var(--aww-background-alt)',
          surface: 'var(--aww-surface)',
          'text-primary': 'var(--aww-text-primary)',
          'text-secondary': 'var(--aww-text-secondary)',
          'brand-primary': 'var(--aww-brand-primary)',
          'brand-accent': 'var(--aww-brand-accent)',
          border: 'var(--aww-border)',
        },
      },
      backgroundImage: {
        'aww-brand-hero': 'var(--aww-gradient-brand-hero)',
        'aww-rainbow': 'var(--aww-gradient-rainbow)',
        'aww-header': 'var(--aww-gradient-header)',
        'aww-cta': 'var(--aww-gradient-cta)',
        'aww-payment': 'var(--aww-gradient-payment)',
        'aww-card': 'var(--aww-gradient-card)',
        'aww-bubble': 'var(--aww-gradient-bubble)',
      },
      borderRadius: {
        'aww-sm': 'var(--aww-radius-sm)',
        'aww-md': 'var(--aww-radius-md)',
        'aww-lg': 'var(--aww-radius-lg)',
        'aww-xl': 'var(--aww-radius-xl)',
        bubble: 'var(--aww-radius-bubble)',
      },
      boxShadow: {
        'aww-sm': 'var(--aww-shadow-sm)',
        'aww-md': 'var(--aww-shadow-md)',
        'aww-lg': 'var(--aww-shadow-lg)',
        'aww-glow-rainbow': 'var(--aww-shadow-glow-rainbow)',
        'aww-glow-orange': 'var(--aww-shadow-glow-orange)',
        'aww-glow-bubble': 'var(--aww-shadow-glow-bubble)',
      },
      animation: {
        'bubble-float': 'aww-bubble-float var(--aww-bubble-float-duration) ease-in-out infinite',
        'bubble-shimmer': 'aww-bubble-shimmer 2.5s ease-in-out infinite',
        'rainbow-shift': 'aww-rainbow-shift var(--aww-rainbow-shift-duration) ease infinite',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        display: ['var(--font-plus-jakarta)', 'var(--font-inter)', 'sans-serif'],
      },
    },
  },
};

export default preset;
