import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ['express', '@genkit-ai/core', 'genkit'],
  transpilePackages: ['openvideo'],
};

export default nextConfig;
