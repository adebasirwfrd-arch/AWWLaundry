import type { NextConfig } from 'next';
import path from 'path';
import { loadEnvConfig } from '@next/env';

// Load monorepo root .env.local (AUTH_GOOGLE_*, BREVO_*, OPENAI_*, etc.)
loadEnvConfig(path.resolve(__dirname, '../..'));

const nextConfig: NextConfig = {
  transpilePackages: ['@aww/design-tokens', '@aww/database', '@aww/shared'],
  experimental: {
    serverActions: {
      bodySizeLimit: '6mb',
    },
  },
};

export default nextConfig;
