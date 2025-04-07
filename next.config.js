/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Railway環境変数のPORTを使用
  serverRuntimeConfig: {
    port: process.env.PORT || 3000
  }
}

module.exports = nextConfig 