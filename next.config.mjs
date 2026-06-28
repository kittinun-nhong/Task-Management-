/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    // Baked in at build time. On Netlify this is unique per deploy (DEPLOY_ID),
    // so the Blobs-backed store self-resets to fresh seed data on every deploy.
    // Empty locally → no reset (dev keeps using data.json).
    SEED_VERSION: process.env.DEPLOY_ID || process.env.COMMIT_REF || '',
  },
};

export default nextConfig;
