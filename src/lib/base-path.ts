/** 反代子路径部署时由构建期注入（如 NEXT_PUBLIC_BASE_PATH=/html），默认根路径 */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? ''
