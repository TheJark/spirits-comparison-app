/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone', // produces a minimal .next/standalone folder for the Docker image
};

module.exports = nextConfig;
