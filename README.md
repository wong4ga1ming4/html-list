# 一页纸（html-list）

自托管的行式书签列表站：统一管理上传的自包含 HTML 文件（报表、单页 demo 等）与外部页面链接。无鉴权，适合个人或内网使用。

## 快速开始

```bash
docker compose up -d
```

打开 `http://localhost:3000` 即可使用。

> **Linux 首次部署注意**：容器以非 root 用户（uid 999）运行，而 Linux 上首次 `up -d` 会由 root 创建 `./data` 挂载目录，导致容器内无法写入（所有保存操作 500）。首次启动前先修好目录归属：
>
> ```bash
> mkdir -p data && sudo chown -R 999:999 data
> ```
>
> Docker Desktop（macOS/Windows）的文件共享层会自动处理权限，无需此步。

- **+ 添加链接**：收藏一个外部页面（标题 + URL + 描述 + 分类）
- **⬆ 上传 HTML**：上传自包含 `.html` 文件，自动提取 `<title>` 作为标题，托管在 `/p/{短链}`，点击卡片新标签页打开
- **⚙**：管理分类（增删改、调序）

## 数据与备份

所有数据都在 `./data` 目录（SQLite 数据库 + 上传的 HTML 文件）。备份 = 拷贝该目录：

```bash
cp -r data /path/to/backup/
```

## 环境变量

| 变量 | 默认值 | 说明 |
|---|---|---|
| `PORT` | `3000` | 服务端口 |
| `DATA_DIR` | `/data`（Docker）/ `./data`（本地开发） | 数据目录（数据库 + 文件） |
| `MAX_UPLOAD_MB` | `20` | 上传文件大小上限（MB） |
| `NEXT_PUBLIC_BASE_PATH` | 空 | **构建参数**。反代子路径部署时设为如 `/html`，全部页面/资源/API/托管页随之挂到该前缀下 |

## 反向代理（子路径部署）

挂在 nginx 的子路径（如 `http://your-host/html`）下时：

1. 项目根建 `.env` 文件：`NEXT_PUBLIC_BASE_PATH=/html`
2. `docker compose up -d --build` 重新构建
3. nginx 配置（**不要**在 `proxy_pass` 末尾加 `/`，保留前缀原样透传）：

```nginx
location /html {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}
```

不需要为 `/_next`、`/api`、`/p` 单独配 location——应用自己全部走 `/html` 前缀。

## 本地开发

```bash
npm install
npm run dev     # 开发服务器
npm test        # 运行测试
npm run build   # 生产构建
```

技术栈：Next.js 15（App Router）+ TypeScript + better-sqlite3 + Tailwind CSS v4。
