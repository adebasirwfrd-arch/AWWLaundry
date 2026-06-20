import type { Config } from 'tailwindcss';
import awwPreset from '@aww/design-tokens/tailwind.preset';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  presets: [awwPreset as Config],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;
