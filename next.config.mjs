/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    // Diagnostic stamp recorded the first time the Blobs store is seeded. Deploys
    // do NOT reset live data — rows added on Netlify persist across pushes.
    // Empty locally (dev keeps using data.json).
    SEED_VERSION: process.env.DEPLOY_ID || process.env.COMMIT_REF || '',
  },
};

export default nextConfig;
