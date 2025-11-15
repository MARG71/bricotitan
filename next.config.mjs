// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'http', hostname: '**' },
      { protocol: 'https', hostname: '**' },
    ],
  },
  eslint: {
    // No parar el build en producción por errores de ESLint
    ignoreDuringBuilds: true,
  },
}
export default nextConfig
