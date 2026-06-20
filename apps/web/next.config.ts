import type { NextConfig } from 'next';
import path from 'path';
import { loadEnvConfig } from '@next/env';

// Satu sumber env: monorepo root .env.local (supaya middleware & API pakai AUTH_SECRET yang sama)
const monoRoot = path.resolve(__dirname, '../..');
loadEnvConfig(monoRoot);

const nextConfig: NextConfig = {
  transpilePackages: ['@aww/design-tokens', '@aww/database', '@aww/shared'],
  // Pastikan secret auth tersedia di middleware (Edge tidak bisa baca load-root-env/fs)
  env: {
    AUTH_SECRET: process.env.AUTH_SECRET,
    AUTH_URL: process.env.AUTH_URL,
    AUTH_TRUST_HOST: process.env.AUTH_TRUST_HOST,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '6mb',
    },
  },
};

export default nextConfig;
