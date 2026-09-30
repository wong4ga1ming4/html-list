import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  // 原生模块必须走 require 直通，避免被打包器改写加载路径
  serverExternalPackages: ['better-sqlite3'],
}

export default nextConfig
