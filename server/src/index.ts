import express, { Express } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { errorHandler } from './middleware/errorHandler.js';
import authRouter from './routes/auth.js';
import childrenRouter from './routes/children.js';
import treesRouter from './routes/trees.js';
import tasksRouter from './routes/tasks.js';
import medalsRouter from './routes/medals.js';
import rewardsRouter from './routes/rewards.js';
import messagesRouter from './routes/messages.js';

dotenv.config({ path: '../.env' });

const app: Express = express();
const PORT = process.env.PORT || 3001;

// ============================================================
// 中间件
// ============================================================
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? process.env.APP_URL
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

// ============================================================
// 错误处理
// ============================================================
app.use(errorHandler);

// ============================================================
// 启动服务器
// ============================================================
app.listen(PORT, () => {
  console.log(`🌳 成就丛林后端服务已启动: http://localhost:${PORT}`);
  console.log(`📋 健康检查: http://localhost:${PORT}/health`);
});

export default app;