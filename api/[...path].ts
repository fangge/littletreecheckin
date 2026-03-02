// Vercel Serverless Function 入口
// 将所有 /api/* 请求转发给 Express 应用
import app from '../server/src/app.js';

export default app;