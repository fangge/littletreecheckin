import express, { Express } from 'express';
import cors from 'cors';
import { errorHandler } from './middleware/errorHandler.js';
import authRouter from './routes/auth.js';
import childrenRouter from './routes/children.js';
import treesRouter from './routes/trees.js';
import tasksRouter from './routes/tasks.js';
import medalsRouter from './routes/medals.js';
import rewardsRouter from './routes/rewards.js';
import messagesRouter from './routes/messages.js';
import goalsRouter from './routes/goals.js';

const app: Express = express();

// ============================================================
// 中间件
// ============================================================
app.use(cors({
  // 生产环境：允许所有来源（Vercel 部署时前后端同域）
  // 如需限制，设置 APP_URL 环境变量
  origin: process.env.NODE_ENV === 'production'
    ? (process.env.APP_URL || true)
    : ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ============================================================
// 健康检查
// ============================================================
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============================================================
// API 路由
// ============================================================
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/users', childrenRouter);
app.use('/api/v1/children', childrenRouter);
app.use('/api/v1/children', treesRouter);
app.use('/api/v1/children', tasksRouter);
app.use('/api/v1/children', medalsRouter);
app.use('/api/v1/children', messagesRouter);
app.use('/api/v1/rewards', rewardsRouter);
app.use('/api/v1/trees', treesRouter);
app.use('/api/v1/tasks', tasksRouter);
app.use('/api/v1/messages', messagesRouter);
app.use('/api/v1/goals', goalsRouter);

// ============================================================
// 错误处理
// ============================================================
app.use(errorHandler);

export default app;