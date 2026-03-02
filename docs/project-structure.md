# 项目结构

```
littletreecheckin/
├── src/                              # 前端源码
│   ├── contexts/
│   │   └── AuthContext.tsx           # 全局认证状态（JWT + localStorage 缓存）
│   ├── services/
│   │   └── api.ts                    # 统一 API 服务层（fetch 封装 + 类型定义）
│   ├── views/                        # 页面视图
│   │   ├── Login.tsx                 # 家长登录
│   │   ├── Register.tsx              # 家长注册（含孩子信息）
│   │   ├── Dashboard.tsx             # 森林主页（树木列表 + 统计 + 时间筛选 + 孩子切换）
│   │   ├── CheckIn.tsx               # 每日打卡（含今日状态检测 + 庆祝弹窗）
│   │   ├── GoalSetting.tsx           # 设置/编辑目标（种树/修改/删除）
│   │   ├── ParentControl.tsx         # 家长审核任务（所有孩子合并显示）
│   │   ├── Store.tsx                 # 果实商店（孩子切换 + 兑换）
│   │   ├── Medals.tsx                # 勋章墙（孩子切换）
│   │   ├── Messages.tsx              # 消息中心
│   │   ├── Profile.tsx               # 个人管理中心（孩子管理 + 入口）
│   │   └── RewardsManagement.tsx     # 奖品管理 + 兑换记录（独立页面）
│   ├── components/
│   │   ├── Navigation.tsx            # 底部导航栏
│   │   └── CelebrationPopup.tsx      # 打卡成功庆祝弹窗（根据进度显示不同文案）
│   ├── App.tsx                       # 路由 + 认证守卫
│   ├── main.tsx                      # 入口（包裹 AuthProvider）
│   └── types.ts                      # 前端视图类型定义
│
├── api/                              # Vercel Serverless Functions
│   └── [...path].ts                  # 捕获所有 /api/* 请求，转发给 Express 应用
│
├── server/                           # 后端源码（本地开发 + Vercel Function 共用）
│   ├── src/
│   │   ├── app.ts                    # Express 应用配置（路由/中间件），导出 app
│   │   ├── index.ts                  # 本地开发入口（加载 dotenv + 启动 listen）
│   │   ├── types.ts                  # 后端类型定义（AuthRequest 等）
│   │   ├── config/
│   │   │   └── supabase.ts           # Supabase 客户端（Vercel 环境跳过 dotenv）
│   │   ├── middleware/
│   │   │   ├── auth.ts               # JWT Bearer Token 验证中间件
│   │   │   └── errorHandler.ts       # 统一错误处理中间件
│   │   ├── routes/
│   │   │   ├── auth.ts               # 认证路由（注册/登录/me/登出）
│   │   │   ├── children.ts           # 孩子管理 + 统计数据路由（支持时间筛选）
│   │   │   ├── trees.ts              # 树木列表 + 目标 CRUD 路由
│   │   │   ├── goals.ts              # 目标更新/删除路由（含勋章撤销）
│   │   │   ├── tasks.ts              # 任务打卡 + 审核路由
│   │   │   ├── medals.ts             # 勋章查询路由
│   │   │   ├── rewards.ts            # 奖励商店 + 兑换 + 奖品 CRUD 路由
│   │   │   └── messages.ts           # 消息发送/查询/已读路由
│   │   └── services/
│   │       └── medalService.ts       # 勋章自动解锁 + 撤销业务逻辑
│   ├── package.json
│   └── tsconfig.json
│
├── supabase/
│   └── migrations/
│       ├── 001_initial_schema.sql    # 10 张业务表 + 索引 + 触发器
│       └── 002_seed_data.sql         # 勋章（9枚）和奖励（6个）初始数据
│
├── docs/                             # 项目文档
│   ├── getting-started.md            # 快速开始（安装/配置/启动）
│   ├── project-structure.md          # 项目结构（本文件）
│   ├── database.md                   # 数据库表结构设计
│   ├── business-logic.md             # 核心业务逻辑
│   ├── api-reference.md              # 完整 API 端点参考
│   └── deployment.md                 # 线上部署指南（Vercel + Supabase）
│
├── .env.example                      # 环境变量模板
├── vercel.json                       # Vercel 部署配置（构建 + 路由 + Function）
├── package.json                      # 前端 + 脚本入口
├── vite.config.ts                    # Vite 配置（含本地开发 /api 代理）
└── tsconfig.json
```

## 关键架构说明

### 前后端一体化（Vercel Serverless）

```
api/[...path].ts          ← Vercel Function 入口（捕获所有 /api/* 请求）
      ↓ 导入
server/src/app.ts         ← Express 应用（路由 + 中间件配置）
      ↓ 使用
server/src/routes/*.ts    ← 各业务路由模块
      ↓ 调用
server/src/config/supabase.ts  ← Supabase 客户端
```

本地开发时，`server/src/index.ts` 直接启动 Express 服务器，Vite 通过代理将 `/api` 请求转发到 `localhost:3001`，行为与生产环境完全一致。

### 前端状态管理

- **认证状态**：`src/contexts/AuthContext.tsx` 通过 React Context 全局管理，JWT token 和用户信息缓存在 `localStorage`
- **当前孩子**：`currentChild` 状态存储在 `AuthContext` 中，各页面通过 `useAuth()` hook 读取和切换
- **API 调用**：统一通过 `src/services/api.ts` 封装，自动附加 Bearer Token