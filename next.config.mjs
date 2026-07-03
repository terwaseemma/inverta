/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Compile the shared + db packages from source; no prebuild step needed in dev.
  transpilePackages: ['@inverta/shared', '@inverta/db'],
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client', '@react-pdf/renderer'],
  },
};

export default nextConfig;
