# 设计文档：Dashboard 打卡日历控件

## Context

本次变更涉及前后端两个系统：
- **后端**：新增一个查询接口，从 `tasks` 表按月份聚合打卡数据
- **前端**：新增两个 UI 组件（日历控件、详情浮层），并集成到 Dashboard 页面

变更跨越前后端，且引入了新的 UI 交互模式（日历 + 浮层），因此需要 design.md 记录关键决策。

## Goals / Non-Goals

**Goals：**
- 在 Dashboard 展示当月打卡日历，高亮已打卡日期
- 支持月份切换（上一月 / 下一月）
- 点击已打卡日期，弹出浮层展示当日任务列表
- 与现有 UI 风格保持一致（TailwindCSS + motion/react）

**Non-Goals：**
- 不支持跨年查询（仅当前年份范围内切换月份）
- 不支持在日历上直接操作任务（只读展示）
- 不引入第三方日历库

## Decisions

### 1. 纯手写日历，不引入第三方库

**决策**：自行实现月度日历组件，不使用 react-calendar、date-fns 等第三方库。

**理由**：
- 功能需求简单（仅展示月度网格 + 高亮标记），不需要复杂的日期选择器功能
- 避免增加包体积
- 项目已有 TailwindCSS，可快速实现所需 UI

**实现方式**：
```typescript
// 计算当月第一天是星期几，生成日期网格
const firstDay = new Date(year, month - 1, 1).getDay(); // 0=周日
const daysInMonth = new Date(year, month, 0).getDate();
// 生成 6行×7列 的日期数组（含上月末尾和下月开头的占位）
```

### 2. 后端接口设计：按月返回完整日历数据

**决策**：新增 `GET /api/v1/children/:childId/checkin-calendar?year=&month=` 接口，一次性返回该月所有打卡日期和每日任务详情。

**理由**：
- 避免前端点击每个日期都发起请求，减少网络往返
- 数据量可控（一个月最多 31 天，每天任务数有限）
- 与现有 stats 接口风格一致

**响应结构**：
```typescript
{
  data: {
    checkin_dates: string[];           // ["2026-03-01", "2026-03-05", ...]
    tasks_by_date: {
      [date: string]: Array<{          // date 格式: "YYYY-MM-DD"
        id: string;
        title: string;
        status: 'pending' | 'approved' | 'rejected';
        checkin_time: string;
        goal_title?: string;           // 关联目标名称
      }>;
    };
  }
}
```

**过滤规则**：排除 `status = 'rejected'` 的任务（被拒绝的打卡不算有效打卡）

### 3. 浮层实现：参考 CelebrationPopup 模式

**决策**：打卡详情浮层采用与 `CelebrationPopup.tsx` 相同的实现模式：固定定位 + 半透明遮罩 + `motion/react` 底部滑入动画。

**理由**：
- 复用现有动画模式，保持 UI 一致性
- `AnimatePresence` + `motion.div` 已在项目中验证可用

### 4. 日历插入位置：统计卡片上方

**决策**：日历控件插入在统计卡片（森林健康度）上方，时间筛选器下方。

**理由**：参考设计图，日历作为"我的成长足迹"独立区块，位于统计数据之前，视觉上更突出打卡轨迹。

## Risks / Trade-offs

- **时区风险**：后端需统一使用 UTC+8 时区将 `checkin_time` 转换为日期字符串，与现有打卡逻辑保持一致 → 复用现有时区处理代码
- **性能**：月份切换时重新请求数据，数据量小，无性能风险

## Open Questions

- 无
