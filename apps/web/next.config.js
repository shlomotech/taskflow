/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@taskflow/shared'],
  output: 'standalone',
};

module.exports = nextConfig;
