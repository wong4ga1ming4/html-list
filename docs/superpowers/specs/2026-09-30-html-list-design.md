# HTML List — 书签式 HTML 门户站 设计文档

日期：2026-09-30
状态：已与用户确认

## 1. 概述

一个自托管的 HTML 门户/书签站。把散落的自包含 HTML 文件（echarts 报表、单页 demo 等）和外部页面链接统一收进一个书签列表主页，方便浏览和访问。

- **管理对象**：本地上传的自包含单文件 HTML + 外部页面链接，两者统一抽象为"书签"
- **部署形态**：Docker 单容器，一条 `docker compose up -d` 启动，volume 持久化
- **鉴权**：无。面向个人/内网使用，不做任何认证授权

## 2. 需求

### 功能需求

- 书签管理（CRUD）：
  - 文件型书签：上传 `.html` 单文件，自动提取 `<title>` 作为默认标题，托管在独立路径，新标签页打开
  - 链接型书签：录入标题 + URL（http/https）+ 描述 + 分类，新标签页跳转
  - 编辑标题/描述/分类；删除（文件型同步删除磁盘文件）
- 分类管理（CRUD）：单选分类，可排序；删除分类时其书签自动归为"未分类"
- 分类筛选 + 关键词搜索（按标题/描述/URL 模糊匹配）
- 书签行式列表展示（非卡片网格），浏览器书签管理器列表视图观感

### 明确不做（YAGNI）

- 无置顶、无访问统计
- 无鉴权、无多用户
- 不支持带资源目录的 HTML（多文件/zip）、不支持替换已上传的文件内容（删除重传即可）
- 无自定义 slug（系统自动生成）
- 无缩略图/截图预览、无暗色主题

### 非功能需求

- 数据库轻量：SQLite 只存元数据，文件在磁盘
- 备份 = 拷贝 volume 目录
- 镜像精简（多阶段构建 + standalone 输出）
- 移动端响应式可用

## 3. 技术选型

| 项 | 选择 | 理由 |
|---|---|---|
| 框架 | Next.js 15（App Router）+ TypeScript | 用户指定；全栈一体，单容器 |
| 数据库 | SQLite（better-sqlite3，WAL 模式） | 零配置、同步调用、无需 ORM/codegen，手写 SQL |
| 样式 | Tailwind CSS v4 | 快速构建列表式 UI，依赖少 |
| 短链 ID | nanoid | 生成 `/p/{slug}` 短链 |
| 测试 | vitest | 集成测试数据层 + API 路由 |

## 4. 架构

单进程 Next.js 应用，同容器内提供页面、REST API 和文件托管：

```
浏览器 ──► Next.js (standalone, :3000)
             ├── 页面  /                书签主页（客户端组件 + fetch）
             ├── API   /api/bookmarks   CRUD、上传、搜索
             ├── API   /api/categories  分类 CRUD
             ├── API   /api/health      健康检查
             └── 托管  /p/[slug]        读取磁盘文件流式返回 text/html
                      │
                      ├── SQLite  $DATA_DIR/html-list.db（元数据）
                      └── 文件    $DATA_DIR/files/{slug}.html（页面文件）
```

- `DATA_DIR` 默认 `/data`（Docker volume 挂载点），本地开发默认 `./data`
- 数据库与文件同在一个 volume，备份即拷目录

## 5. 数据模型

```sql
CREATE TABLE categories (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE bookmarks (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  type        TEXT NOT NULL CHECK (type IN ('file', 'link')),
  title       TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  url         TEXT,                      -- link 类型必填，http/https
  file_name   TEXT,                      -- file 类型：磁盘文件名 {slug}.html
  slug        TEXT UNIQUE,               -- file 类型：访问路径 /p/{slug}
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_bookmarks_category ON bookmarks(category_id);
```

约束：

- `file` 类型：`file_name`、`slug` 必填，`url` 为空
- `link` 类型：`url` 必填，`file_name`、`slug` 为空
- 删除分类 → `ON DELETE SET NULL`，书签归入"未分类"
- `updated_at` 在每次 PATCH 时更新

## 6. API 设计

所有响应 JSON。错误统一 `{ error: string }` + 恰当的 HTTP 状态码。

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/bookmarks?q=&category=` | 列表。`q` 对 title/description/url 做 LIKE 模糊搜索；`category` 为分类 id 或 `uncategorized`；按 `created_at DESC` 排序 |
| POST | `/api/bookmarks` | 创建链接型书签。Body：`{ title, url, description?, category_id? }` |
| POST | `/api/bookmarks/upload` | multipart/form-data：`file`（.html）+ 可选 `title/description/category_id`。创建文件型书签 |
| PATCH | `/api/bookmarks/[id]` | 编辑 `title/description/category_id`（部分更新） |
| DELETE | `/api/bookmarks/[id]` | 删除。文件型同时删除 `DATA_DIR/files/{file_name}` |
| GET | `/api/categories` | 列表（含每个分类的书签计数），按 sort_order |
| POST | `/api/categories` | 创建。Body：`{ name }` |
| PATCH | `/api/categories/[id]` | 改名 / 调整 sort_order |
| DELETE | `/api/categories/[id]` | 删除，书签归为未分类 |
| GET | `/p/[slug]` | 托管页面。查库得 `file_name`，从磁盘读取流式返回，`Content-Type: text/html; charset=utf-8`。未找到返回 404 页 |
| GET | `/api/health` | `{ ok: true }`，供 Docker healthcheck |

### 错误处理

- 上传：仅接受 `.html` 后缀；大小上限 `MAX_UPLOAD_MB`（默认 20MB）→ 超限 413
- 链接：URL 必须以 `http://` 或 `https://` 开头 → 否则 400
- 必填校验（title、link 的 url）→ 400，附可读的错误信息
- slug 冲突：nanoid 重新生成，最多重试 5 次
- `/p/[slug]`：仅按数据库记录定位文件，文件名不接用户输入，杜绝路径穿越
- 磁盘文件意外缺失：`/p/[slug]` 返回 404；DELETE 时文件不存在仍删库记录（容忍不一致）

### 上传流程

1. 校验后缀与大小
2. 读文件内容（Buffer，限制内全量读入可接受）
3. 正则提取 `<title>...</title>`（取第一个，trim，截断到 100 字符），无则用文件名（去后缀）
4. 生成 slug（nanoid，10 位），写入 `DATA_DIR/files/{slug}.html`，冲突则重试
5. 插入 bookmarks 记录，返回完整书签

## 7. UI 设计

单页主页 `/`，客户端组件 + fetch，无全局状态库：本地 state 管理列表，任何增删改操作成功后重新拉取列表。

```
┌────────────────────────────────────────────────────┐
│  📚 HTML List    [🔍 搜索…]  [+ 添加链接] [⬆ 上传] [⚙] │
├────────────────────────────────────────────────────┤
│  [全部] [未分类] [报表] [Demo] [工具] …             │
├────────────────────────────────────────────────────┤
│  📄 销售月报 2026-08        [报表]   /p/ab3xk9    │
│     描述文字单行截断…                     ✏️  🗑   │
│  ──────────────────────────────────────────────  │
│  🔗 ECharts 官网             [工具]  echarts.apache.org │
│     描述文字单行截断…                     ✏️  🗑   │
│  ──────────────────────────────────────────────  │
│  …（垂直列表，紧凑行高，行间细分隔线）              │
└────────────────────────────────────────────────────┘
```

- **列表行**：类型图标（📄/🔗）+ 标题 + 描述（单行截断）+ 分类徽标 + 右侧灰色小字（域名或 `/p/xxx` 路径）；整行可点 `target="_blank" rel="noopener"`
- **行操作**：悬停/聚焦时行尾浮现 ✏️ 编辑、🗑 删除（带确认弹窗）
- **添加/编辑**：模态框。外链：标题+URL+描述+分类；上传：选文件自动提取 title 预填，可改
- **分类管理**（⚙）：对话框内增删改 + 上/下移排序
- **空状态**：无书签 → 引导文案 + 快捷按钮；搜索无结果 → 提示清空关键词
- 亮色主题，紧凑行式列表 + 行间细分隔线；所有操作后乐观更新或重新拉取列表

## 8. Docker 部署

- **Dockerfile（多阶段）**：
  1. `deps`：`node:20-alpine`，装 python3/make/g++（编译 better-sqlite3）
  2. `builder`：`npm ci` + `next build`（`output: 'standalone'`）
  3. `runner`：`node:20-alpine`，仅拷贝 standalone 产物 + `.next/static` + `public`，非 root 用户运行
- **docker-compose.yml**：端口映射、`./data:/data` volume、healthcheck（`/api/health`）
- **环境变量**：`PORT=3000`、`DATA_DIR=/data`、`MAX_UPLOAD_MB=20`
- **.dockerignore**：node_modules、.next、data、.git

## 9. 测试策略

- **vitest 集成测试**（对数据层 + API 路由，用临时 DATA_DIR）：
  - 分类 CRUD、删除分类后书签归未分类
  - 链接书签 CRUD、URL 校验
  - 上传：title 提取、后缀/大小校验、slug 生成
  - 搜索（q 命中 title/description/url）与分类筛选
  - 删除文件书签 → 磁盘文件同步清理
- **`/p/[slug]`**：Content-Type 正确、404、恶意 slug（如 `../`）无法越界
- **冒烟**：`docker build && docker compose up` 后手动过主流程（上传→列表出现→新标签页→编辑→删除）

## 10. 项目结构

```
html-list/
├── src/
│   ├── app/
│   │   ├── page.tsx                 # 书签主页
│   │   ├── layout.tsx
│   │   ├── globals.css
│   │   ├── p/[slug]/route.ts        # 托管 HTML
│   │   └── api/
│   │       ├── health/route.ts
│   │       ├── bookmarks/route.ts           # GET 列表 / POST 创建链接
│   │       ├── bookmarks/upload/route.ts    # POST 上传
│   │       ├── bookmarks/[id]/route.ts      # PATCH / DELETE
│   │       ├── categories/route.ts          # GET / POST
│   │       └── categories/[id]/route.ts     # PATCH / DELETE
│   ├── components/                  # BookmarkRow、Dialog、CategoryChips…
│   ├── lib/
│   │   ├── db.ts                    # better-sqlite3 初始化 + 建表
│   │   ├── files.ts                 # 文件写入/删除/slug/title 提取
│   │   └── types.ts
│   └── tests/                       # vitest 集成测试
├── data/                            # 本地开发数据（gitignore）
├── Dockerfile
├── docker-compose.yml
└── package.json
```
