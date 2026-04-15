# 统计页「每周记录天数」实现计划

> 基于 spec：`docs/superpowers/specs/2026-04-15-stats-recorded-days-design.md`

## 实施目标

在 `StatsPage` 中增加每周记录天数与 7 天分布可视化，并采用后端聚合（方案 1），由 `GET /api/stats/weeks` 一次性返回：

- `recordedDays: number`
- `dayFlags: boolean[7]`（周一到周日）

---

## Task 1：后端类型与接口扩展

**文件：**

- `functions/api/stats/weeks.ts`
- `src/db/types.ts`（如有前端复用的周条目类型）
- `src/pages/StatsPage.tsx`（API 响应类型声明）

**步骤：**

- [ ] 定位现有 `/api/stats/weeks` 返回结构
- [ ] 为周条目增加 `recordedDays` 与 `dayFlags`
- [ ] 保持旧字段兼容（`weekKey`、`score` 等）
- [ ] 若共享类型存在，统一补充新字段

**完成标准：**

- TypeScript 无类型错误
- 前后端对新字段命名与含义一致

---

## Task 2：实现每周活动天计算逻辑

**文件：**

- `functions/api/stats/weeks.ts`
- （可选）`functions/_shared/*` 中新增小型纯函数工具

**步骤：**

- [ ] 从 `weekKey` 计算该周周一~周日 dateKey
- [ ] 查询该用户这 7 天内的 `daily_entries`
- [ ] 解析 `habit_values_json`，按规则判定“该日是否有记录”：
  - toggle 为 `true` 计入
  - numeric 为有效数字（含 `0`）计入
- [ ] 产出 `dayFlags`（长度 7）与 `recordedDays`
- [ ] 解析异常兜底：该日按 `false`，不中断整周响应

**完成标准：**

- 可稳定返回 `dayFlags.length === 7`
- `recordedDays` 始终等于 `dayFlags` 中 `true` 数量
- 不出现因单条坏数据导致接口 500

---

## Task 3：统计页 UI 重构（当前周大卡 + 历史周迷你格）

**文件：**

- `src/pages/StatsPage.tsx`
- （可选）`src/components/stats/WeekActivityGrid.tsx`
- （可选）`src/components/stats/CurrentWeekActivityCard.tsx`

**步骤：**

- [ ] 在页面顶部新增当前周活动卡：`本周 x/7 天` + 大号 7 格
- [ ] 在历史周列表每行增加迷你 7 格与 `x/7`
- [ ] 保留现有周链接跳转
- [ ] 对当前日期格增加轻量强调（描边或标记）
- [ ] 空态时仍展示当前周 `0/7` 与全灰格

**完成标准：**

- 视觉层级清晰，信息不拥挤
- 当前周与历史周展示同时成立
- 不影响已有导航和周分展示

---

## Task 4：样式与交互精修（frontend-design 方向）

**文件：**

- `src/pages/StatsPage.tsx`（或拆分组件文件）
- 样式文件（若项目已有集中样式）

**步骤：**

- [ ] 定义统一色彩语义：有记录/无记录/今日
- [ ] 大卡与迷你格采用一致视觉语言（仅尺寸差异）
- [ ] 增加低成本动效（加载渐进、hover 轻反馈）
- [ ] 保证深浅背景下对比度可读

**完成标准：**

- 视觉一致且具可读性
- 无多余重动画影响性能

---

## Task 5：测试与验收

**文件：**

- 后端相关测试（如已有 `vitest` 后端测试目录）
- 手工验收记录（PR 描述或提交说明）

**步骤：**

- [ ] 增加/更新后端测试覆盖：
  - toggle=true 计入
  - numeric=0 计入
  - 全空值不计入
  - 非法 JSON 不导致 500
- [ ] 前端手工验证：
  - 当前周大卡正确
  - 历史周迷你格与 `x/7` 一致
  - 空态、错误态可用
- [ ] 运行 `npm run test:run` 与 `npm run build`

**完成标准：**

- 测试通过
- 构建通过
- 页面可用且无明显回归

---

## 变更顺序建议（低风险）

1. 先做后端字段扩展与计算（Task 1-2）
2. 再接前端渲染（Task 3）
3. 最后做视觉精修与测试（Task 4-5）

---

## 风险与回滚

**风险点：**

- `habit_values_json` 历史数据结构不一致
- 周内日期计算与时区边界导致错位

**应对：**

- 解析失败单日降级为 `false`
- 统一沿用现有周计算工具函数，避免重复实现

**回滚策略：**

- 若上线出现问题，先回滚到不含新字段的 stats 响应版本
- 前端对缺失字段做兜底（`dayFlags` 全 `false`，`recordedDays=0`）确保页面不崩

