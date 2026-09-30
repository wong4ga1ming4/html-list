FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# 受限网络默认走 npmmirror，可用 --build-arg NPM_REGISTRY=https://registry.npmjs.org 覆盖
ARG NPM_REGISTRY=https://registry.npmmirror.com
# 优先用 better-sqlite3 官方预编译（x86_64 可用），并在构建期验证真的能打开数据库；
# 段错误/缺失（如 arm64 预编译）才回退源码编译——apt 只装在回退分支，
# 避免连不上 Debian 源的服务器卡死在 apt-get
RUN npm ci --registry=$NPM_REGISTRY \
  && cd node_modules/better-sqlite3 \
  && if node -e "new (require('better-sqlite3'))(':memory:')" 2>/dev/null; then \
       echo "better-sqlite3: using bundled prebuild"; \
     else \
       echo "better-sqlite3: prebuild unusable, compiling from source"; \
       apt-get update \
       && apt-get install -y --no-install-recommends python3 make g++ \
       && rm -rf prebuilds \
       && NPM_CONFIG_REGISTRY=$NPM_REGISTRY \
          NODEJS_ORG_MIRROR=https://registry.npmmirror.com/-/binary/node \
          npx --yes node-gyp rebuild --release; \
     fi \
  && node -e "new (require('better-sqlite3'))(':memory:')" \
  && echo "better-sqlite3: verified"

FROM deps AS builder
COPY . .
RUN npm run build

FROM node:22-bookworm-slim AS runner
WORKDIR /app
# Next standalone 用 HOSTNAME 作监听地址，而 Docker 会把它设为容器 ID：
# 必须显式绑 0.0.0.0，否则容器内 localhost 连不上（healthcheck 失败）
ENV NODE_ENV=production DATA_DIR=/data PORT=3000 HOSTNAME=0.0.0.0
RUN groupadd -r app && useradd -r -g app app
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
# standalone 输出追踪对原生模块不可靠：better-sqlite3 整目录以 deps 阶段
# 已验证的状态（预编译或编译产物）原样覆盖进来
RUN rm -rf node_modules/better-sqlite3 \
  && mkdir -p /data \
  && chown -R app:app /data /app
COPY --from=deps --chown=app:app /app/node_modules/better-sqlite3 ./node_modules/better-sqlite3
USER app
EXPOSE 3000
CMD ["node", "server.js"]
