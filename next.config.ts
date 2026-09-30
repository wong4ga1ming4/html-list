import type { NextConfig } from 'next'

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || undefined

const nextConfig: NextConfig = {
  output: 'standalone',
  // 原生模块必须走 require 直通，避免被打包器改写加载路径
  serverExternalPackages: ['better-sqlite3'],
  // 反代子路径部署（构建时 NEXT_PUBLIC_BASE_PATH=/html）；默认根路径
  ...(basePath ? { basePath } : {}),
}

export default nextConfig
