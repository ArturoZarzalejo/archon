import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  env: {
    ARCHON_PROJECT_ROOT: process.env.ARCHON_PROJECT_ROOT || process.cwd(),
  },
};

export default nextConfig;
