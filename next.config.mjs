// PostHog ingest host (US cloud default; set NEXT_PUBLIC_POSTHOG_HOST to
// https://eu.i.posthog.com for EU-cloud accounts).
const posthogHost =
  process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com';
const posthogAssets = posthogHost.replace('.i.posthog.com', '-assets.i.posthog.com');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Compile the shared + db packages from source; no prebuild step needed in dev.
  transpilePackages: ['@inverta/shared', '@inverta/db'],
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client', '@react-pdf/renderer'],
  },
  // Reverse-proxy PostHog through our own domain so ad-blockers don't drop
  // analytics events.
  async rewrites() {
    return [
      { source: '/ingest/static/:path*', destination: `${posthogAssets}/static/:path*` },
      { source: '/ingest/:path*', destination: `${posthogHost}/:path*` },
    ];
  },
  // PostHog API calls include trailing slashes Next would otherwise redirect.
  skipTrailingSlashRedirect: true,
};

export default nextConfig;
