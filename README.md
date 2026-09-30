# HTML List

自托管的行式书签列表站：统一管理上传的自包含 HTML 文件（报表、单页 demo 等）与外部页面链接。无鉴权，适合个人或内网使用。

## 快速开始

```bash
docker compose up -d
```

打开 `http://localhost:3000` 即可使用。

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

## 本地开发

```bash
npm install
npm run dev     # 开发服务器
npm test        # 运行测试
npm run build   # 生产构建
```

技术栈：Next.js 15（App Router）+ TypeScript + better-sqlite3 + Tailwind CSS v4。
