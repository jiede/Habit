# 每日记录 / Daily Life Tracker

A lightweight web app for logging daily habits and weekly reviews. The production architecture uses **Cloudflare Pages + Functions + D1** with email/password auth (see design spec below). Local `npm run dev` serves the UI; API routes run when you use `wrangler pages dev` or deploy to Cloudflare.

## 1.Daily Record

## 2.Weekly Statistics

## 3.History

## 4.Add Habit

## Commands

```bash
npm install
npm run dev
npm run test:run
npm run build
```

Optional: preview the production build locally:

```bash
npm run preview
```

## Design spec

- [Cloudflare + D1 architecture (current)](docs/superpowers/specs/2026-04-14-cloudflare-d1-daily-tracker-design.md)
- [Original IndexedDB-only design (historical)](docs/superpowers/specs/2026-04-11-daily-life-tracker-design.md)

## Data & privacy

**中文：** 登录后数据保存在 **Cloudflare D1**（由 Worker 访问）；请勿把 `SESSION_SECRET`、数据库凭据等写入仓库，使用 Cloudflare Secrets / `.dev.vars`（本地，且已 gitignore）。

**English:** After sign-in, data is stored in **Cloudflare D1** behind Worker APIs. Do not commit secrets; use Cloudflare Secrets and local `.dev.vars` (gitignored).

## Cloudflare (outline)

1. Create a D1 database in the Cloudflare dashboard and set `database_id` in `wrangler.toml` (replace `__SET_IN_CLOUDFLARE__`).
2. Apply migrations: `npx wrangler d1 migrations apply habit-db --remote` (and `--local` for dev).
3. Set secrets (e.g. `SESSION_SECRET`) via `wrangler secret put SESSION_SECRET`.
4. Build the app: `npm run build`.
5. Deploy Pages project pointing at this repo; configure Functions + D1 binding `DB` to the same database.

Details: [migration plan](docs/superpowers/plans/2026-04-14-cloudflare-d1-migration-plan.md).

### Cloudflare Pages：构建成功但 deploy 失败

若日志里在 `npm run build` 成功之后还执行了 **`npx wrangler deploy`**，会出现：

- `Missing entry-point to Worker script or to assets directory`
- 或提示应使用 **`wrangler pages deploy`**

**原因：** `wrangler deploy` 用于「独立 Worker」项目；本项目是 **Pages（静态 `dist` + `functions/`）**，不能用它当 Pages 的发布步骤。

**在 Cloudflare Dashboard 里改法（推荐）：**

1. 打开该 Pages 项目 → **Settings** → **Builds & deployments**。
2. **Build command** 保持：`npm run build`（或 `npm ci && npm run build`）。
3. **Build output directory** 填：`dist`。
4. **Deploy command**（或「自定义 deploy 命令」一类字段）**留空 / 删除**。  
   Git 集成的 Pages 会在构建完成后 **自动上传 `dist`**，并带上仓库里的 **`functions/`**，无需再跑 `wrangler deploy`。
5. 在同一项目的 **Functions** 绑定里把 **D1** 绑定名为 `DB` 的数据库（与 `wrangler.toml` 里 `binding = "DB"` 一致），并在该环境下配置 **Secrets**（如 `SESSION_SECRET`）。

**若你坚持用命令行发布（CI 或本机）：** 使用 Pages 专用命令，例如：

```bash
npm run build
npx wrangler pages deploy dist --project-name=你的Pages项目名
```

（需在环境里配置 `CLOUDFLARE_API_TOKEN` 等，详见 Wrangler 文档。）

## 本地完整流程测试（推荐）

前端里的接口路径是 **`/api/*`**。只用 `npm run dev`（Vite）时，**没有** Cloudflare Functions，注册/登录会失败。要测完整链路，请用 **Wrangler 在本地跑构建产物 + D1**：

1. **准备环境变量（不要提交）**

   ```bash
   cp .dev.vars.example .dev.vars
   ```

   编辑 `.dev.vars`：把 `SESSION_SECRET` 换成至少 32 字节的随机字符串；`COOKIE_DOMAIN` 一般保持 `localhost` 即可。

2. **初始化本地 D1（只需一次或 schema 变更后）**

   ```bash
   npx wrangler d1 migrations apply habit-db --local
   ```

3. **构建前端**

   ```bash
   npm run build
   ```

4. **启动 Pages + Functions + 本地 D1**

   ```bash
   npx wrangler pages dev dist --local
   ```

   终端里会打印本地 URL（常见为 `http://127.0.0.1:8788`）。用浏览器打开该地址。

5. **按产品流程自测**

   - 注册账号 → 登录  
   - 「习惯」里新增 / 归档 / 排序  
   - 「今日」里打卡与文字保存  
   - 「本周」里查看汇总并填写周分与周记  
   - 「统计」里能看到周列表  

6. **仅跑单元测试（不启动 Cloudflare）**

   ```bash
   npm run test:run
   ```

## 文档在哪里？

设计说明与实施计划在仓库的 **`docs/superpowers/`** 下（已纳入 git）：

| 文件 | 说明 |
|------|------|
| `docs/superpowers/specs/2026-04-14-cloudflare-d1-daily-tracker-design.md` | 当前架构（Cloudflare + D1 + 登录） |
| `docs/superpowers/plans/2026-04-14-cloudflare-d1-migration-plan.md` | 迁移与实现任务拆解 |
| `docs/superpowers/specs/2026-04-11-daily-life-tracker-design.md` | 早期仅 IndexedDB 方案（历史） |
| `docs/superpowers/plans/2026-04-11-daily-life-tracker.md` | 早期实现计划（历史） |

若在 GitHub 网页上看不到：请确认 **`main` 已 push**（本地可能超前于远端）。在 Cursor 左侧文件树请展开 **`docs`** 文件夹（默认不会把 `docs` 放在根目录以外）。