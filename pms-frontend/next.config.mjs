// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        // The destination is the backend service in docker-compose
        destination: 'http://app:3000/:path*',
      },
    ]
  },
};

export default nextConfig;
