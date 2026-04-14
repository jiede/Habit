# 每日记录网站（Cloudflare 一体化版）— 设计说明

**日期：** 2026-04-14  
**状态：** 已评审（对话确认）  
**范围：** Cloudflare Pages + Workers + D1，邮箱密码登录，首版不支持离线写入

---

## 1. 目标与成功标准

### 1.1 产品目标

在保留现有产品能力（习惯管理、每日记录、每周总结、统计页面）的前提下，将原本本地 IndexedDB 架构升级为 Cloudflare 一体化在线架构：

- 前端部署在 Cloudflare Pages
- API 由 Cloudflare Workers 提供
- 数据存储在 Cloudflare D1
- 用户通过邮箱 + 密码登录

### 1.2 成功标准（验收）

- 用户可完成闭环：注册/登录 → 习惯管理 → 每日记录 → 每周总结评分 → 统计查看。
- 不同账号之间数据完全隔离（只能看到自己的记录）。
- Cloudflare Pages + Worker + D1 可完成部署并可用。
- 不在仓库中保存任何敏感信息（数据库口令、密钥、真实密码）。

### 1.3 范围外（首版不做）

- 离线写入与断网同步
- 第三方登录（Google/GitHub）
- 多端冲突合并策略

---

## 2. 架构方案（已定：Cloudflare 一体化）

### 2.1 技术选型

- **前端：** 现有 `Vite + React + TypeScript`
- **托管：** Cloudflare Pages
- **后端：** Cloudflare Workers（`/api/*`）
- **数据库：** Cloudflare D1
- **会话：** Worker 侧 session + HttpOnly Cookie

### 2.2 架构原则

- 前端不直连数据库，只调用自有 Worker API。
- Worker 负责鉴权、权限校验、数据写入。
- 每个数据查询必须带 `user_id` 过滤，确保隔离。

---

## 3. 数据模型（D1）

### 3.1 表结构

#### `users`
- `id` TEXT PRIMARY KEY（UUID）
- `email` TEXT UNIQUE NOT NULL
- `password_hash` TEXT NOT NULL
- `created_at` INTEGER NOT NULL

#### `sessions`
- `id` TEXT PRIMARY KEY（随机 token）
- `user_id` TEXT NOT NULL
- `expires_at` INTEGER NOT NULL
- `created_at` INTEGER NOT NULL

#### `habits`
- `id` TEXT PRIMARY KEY
- `user_id` TEXT NOT NULL
- `name` TEXT NOT NULL
- `type` TEXT NOT NULL（`toggle` / `numeric`）
- `unit` TEXT NULL
- `sort_order` INTEGER NOT NULL
- `archived_at` INTEGER NULL
- `created_at` INTEGER NOT NULL

#### `daily_entries`
- `user_id` TEXT NOT NULL
- `date_key` TEXT NOT NULL（`YYYY-MM-DD`）
- `habit_values_json` TEXT NOT NULL
- `today_review` TEXT NOT NULL
- `tomorrow_plan` TEXT NOT NULL
- `updated_at` INTEGER NOT NULL
- PRIMARY KEY (`user_id`, `date_key`)

#### `weekly_entries`
- `user_id` TEXT NOT NULL
- `week_key` TEXT NOT NULL（如 `2026-W15`）
- `score` REAL NULL
- `week_review` TEXT NOT NULL
- `next_week_plan` TEXT NOT NULL
- `updated_at` INTEGER NOT NULL
- PRIMARY KEY (`user_id`, `week_key`)

### 3.2 业务规则

- 周定义保持不变：周一到周日（本地时区）。
- 归档习惯保留历史可读性，不硬删历史记录。
- 数值型习惯继续区分“未填”与“填 0”。

---

## 4. API 设计（Worker）

### 4.1 鉴权接口

- `POST /api/auth/register`：注册
- `POST /api/auth/login`：登录并写 HttpOnly Cookie
- `POST /api/auth/logout`：登出并清 Cookie
- `GET /api/auth/me`：获取当前用户

### 4.2 业务接口

- `GET /api/habits`
- `POST /api/habits`
- `PATCH /api/habits/:id`

- `GET /api/daily/:dateKey`
- `PUT /api/daily/:dateKey`

- `GET /api/weekly/:weekKey`
- `PUT /api/weekly/:weekKey`

- `GET /api/stats/weeks`

### 4.3 鉴权与权限

- 所有业务接口先校验 session。
- 若未登录或 session 失效，返回 `401`。
- 所有读写必须追加 `WHERE user_id = ?`。

---

## 5. 配置与安全

### 5.1 配置原则

用户提出“密码放配置文件”，本方案落地为：

- 前端仅保留公开配置（例如 API 基础路径）。
- 敏感配置（会话签名密钥等）放 Cloudflare secrets（`wrangler secret` / Dashboard）。
- 不提交 `.env` 中的敏感值到 git。

### 5.2 密码处理

- 用户密码仅保存 hash（bcrypt/argon2），不保存明文。
- 不在日志输出密码、token、完整 cookie。

---

## 6. 错误处理与用户体验

- `401`：前端跳转登录页并提示“请先登录”。
- `400`：参数错误（如非法 weekKey/dateKey）。
- `500`：保存失败统一提示“请稍后重试”。
- 网络断开：提示网络异常；首版不做离线缓存写回。

---

## 7. 测试与验收

### 7.1 后端测试

- 注册/登录/登出流程
- 会话失效处理
- 用户隔离（A 无法访问 B）
- `daily_entries`、`weekly_entries` upsert 正确性

### 7.2 前端关键验证

- 登录后访问主流程页面
- 习惯新增/归档/排序可保存
- 每日与每周数据可读写
- 统计页展示周列表及分数

### 7.3 通过标准

- `npm run build` 通过
- 关键流程可手工验证跑通
- 部署到 Cloudflare 后可访问并正常登录使用

---

## 8. 变更记录

| 日期 | 说明 |
|------|------|
| 2026-04-14 | 新增 Cloudflare 一体化方案，替代 IndexedDB 本地持久化方案 |
