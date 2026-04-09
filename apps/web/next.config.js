const path = require('path')

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Explicitly set the workspace root to the apps/web directory to avoid
  // Next.js picking up the repo root package-lock.json in a monorepo layout.
  outputFileTracingRoot: path.join(__dirname, '../../'),
}

module.exports = nextConfig
