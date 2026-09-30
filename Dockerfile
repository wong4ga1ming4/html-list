FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# 受限网络默认走 npmmirror，可用 --build-arg NPM_REGISTRY=https://registry.npmjs.org 覆盖
ARG NPM_REGISTRY=https://registry.npmmirror.com
# better-sqlite3 v13 自带的 linux-arm64 预编译二进制会段错误：
# 删除 prebuilds 强制源码编译（需要 python3/make/g++），并断言编译产物存在
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && npm ci --registry=$NPM_REGISTRY \
  && rm -rf node_modules/better-sqlite3/prebuilds \
  && cd node_modules/better-sqlite3 \
  && NPM_CONFIG_REGISTRY=$NPM_REGISTRY \
     NODEJS_ORG_MIRROR=https://registry.npmmirror.com/-/binary/node \
     npx --yes node-gyp rebuild --release \
  && test -f build/Release/better_sqlite3.node

FROM deps AS builder
COPY . .
RUN npm run build

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production DATA_DIR=/data PORT=3000
RUN groupadd -r app && useradd -r -g app app
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
# standalone 追踪会带回 prebuilds 且漏掉编译产物：删掉预编译、显式拷入源码编译的二进制
RUN rm -rf node_modules/better-sqlite3/prebuilds \
  && mkdir -p node_modules/better-sqlite3/build/Release /data \
  && chown -R app:app /data /app
COPY --from=deps --chown=app:app \
  /app/node_modules/better-sqlite3/build/Release/better_sqlite3.node \
  node_modules/better-sqlite3/build/Release/
USER app
EXPOSE 3000
CMD ["node", "server.js"]
