/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Railway環境変数のPORTを使用
  serverRuntimeConfig: {
    port: process.env.PORT || 3000
  },
  images: {
    unoptimized: true,
    domains: ['railway.app']
  },
  assetPrefix: process.env.NODE_ENV === 'production' ? '' : '',
  publicRuntimeConfig: {
    staticFolder: '/static',
  }
}

module.exports = nextConfig 