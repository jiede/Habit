# Week 页面开关文案与活动格增强实现计划

> 关联 spec：`docs/superpowers/specs/2026-04-15-weekpage-toggle-copy-and-activity-grid-design.md`

## 目标

在不改变后端 API 的前提下，完成以下两项体验优化：

1. Week 页开关型习惯文案改为仅显示 `完成 X 天`
2. 在 Week 页「本周习惯概览」下新增迷你活动格与 `X / 7 天有记录`

同时复用统计页活动格组件与记录口径，保证一致性与可维护性。

---

## Task 1：抽离共享活动格组件

**文件：**

- `src/components/stats/WeekDayGrid.tsx`（新增）
- `src/pages/StatsPage.tsx`（改为复用组件）

**步骤：**

- 从 `StatsPage` 抽出周活动格 UI 到 `WeekDayGrid`
- 组件支持 `dayFlags`、`compact`、`currentDayIndex` 参数
- `StatsPage` 接入新组件并保持当前视觉不回退

**验收标准：**

- `StatsPage` 渲染结果与改动前一致（含当前周大卡 + 历史周迷你格）
- 组件可在 Week 页复用，无额外样式冲突

---

## Task 2：沉淀周活动计算函数（前端）

**文件：**

- `src/lib/aggregate.ts`
- `src/lib/__tests__/aggregate.test.ts`（扩展）

**步骤：**

- 新增 `summarizeWeekActivity(...)`，输出：
  - `dayFlags: boolean[7]`
  - `recordedDays: number`
- 复用与统计页一致口径：
  - `toggle === true` 计入
  - `numeric` 为有效数字（含 `0`）计入
- 覆盖异常/空值兜底逻辑

**验收标准：**

- 单元测试覆盖 4 类核心场景（`toggle=true`、`numeric=0`、空值、长度与计数一致性）
- 函数在 Week 与 Stats 视图可复用

---

## Task 3：Week 页接入本周活动迷你摘要

**文件：**

- `src/pages/WeekPage.tsx`

**步骤：**

- 基于已加载 `days` + `keys` 计算 `dayFlags`、`recordedDays`
- 在「本周习惯概览」标题下方插入摘要块：
  - 标题：`本周活动`
  - 文案：`${recordedDays} / 7 天有记录`
  - 迷你活动格：`<WeekDayGrid compact ... />`
- 当前日使用轻量描边（可选）

**验收标准：**

- 摘要位置准确（在概览标题下，习惯列表前）
- 不新增网络请求
- 页面加载与保存流程无行为回归

---

## Task 4：开关型习惯文案简化

**文件：**

- `src/pages/WeekPage.tsx`

**步骤：**

- 定位开关摘要文案输出逻辑
- 将文案从：
  - `完成 X 天，未完成 Y 天，未记录 Z 天`
  - 调整为：`完成 X 天`
- 数值型习惯文案保持现状不变

**验收标准：**

- 开关型习惯仅显示 `完成 X 天`
- 无“未完成/未记录”文案残留

---

## Task 5：验证与回归

**文件：**

- 受影响页面：`src/pages/StatsPage.tsx`、`src/pages/WeekPage.tsx`
- 测试文件：`src/lib/__tests__/aggregate.test.ts`（以及必要新增测试）

**步骤：**

- 运行单测：`npm run test:run`
- 运行构建：`npm run build`
- 手工验证：
  - Week 页新增摘要显示正确
  - Week 页开关文案正确
  - Stats 页活动格无视觉回退
  - 当前周/历史周活动格口径一致

**验收标准：**

- 测试与构建全部通过
- 关键页面功能和样式稳定

---

## 执行顺序（建议）

1. Task 1（先抽组件，防止重复改样式）
2. Task 2（统一计算口径）
3. Task 3 + Task 4（接入 Week 页展示与文案）
4. Task 5（统一验证）

---

## 风险与回滚

### 风险

- 抽组件后 `StatsPage` 视觉细节漂移
- Week 页与 Stats 页口径实现不一致

### 缓解

- 先替换 Stats，再接 Week，逐步验证
- 活动计算统一走 `summarizeWeekActivity`，避免双实现

### 回滚

- 若 Week 新增摘要异常：先移除 Week 页接入，保留 Stats 组件抽离
- 若组件抽离导致样式回退：恢复 `StatsPage` 旧渲染块，再迭代组件样式

