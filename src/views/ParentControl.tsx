import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { tasksApi, messagesApi, TaskData } from '../services/api';

interface ParentControlProps {
  onBack: () => void;
}

// 任务数据扩展：附带孩子姓名
interface TaskWithChild extends TaskData {
  childName?: string;
  childId?: string;
}

export default function ParentControl({ onBack }: ParentControlProps) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<TaskWithChild[]>([]);
  const [activeTab, setActiveTab] = useState<'pending' | 'approved'>('pending');
  const [isLoading, setIsLoading] = useState(true);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    if (!user?.children || user.children.length === 0) return;
    setIsLoading(true);
    try {
      // 并行获取所有孩子的任务
      const results = await Promise.all(
        user.children.map(child =>
          tasksApi.list(child.id, activeTab).then(res =>
            res.data.map(task => ({
              ...task,
              childName: child.name,
              childId: child.id,
            }))
          )
        )
      );
      // 合并并按打卡时间倒序排列
      const allTasks = results.flat().sort(
        (a, b) => new Date(b.checkin_time).getTime() - new Date(a.checkin_time).getTime()
      );
      setTasks(allTasks);
    } catch (err) {
      console.error('获取任务失败:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.children, activeTab]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleApprove = async (task: TaskWithChild) => {
    setProcessingId(task.id);
    try {
      await tasksApi.approve(task.id);
      // 发送鼓励消息给对应孩子
      const note = notes[task.id];
      if (note && task.childId) {
        await messagesApi.send(task.childId, note);
      }
      await fetchTasks();
    } catch (err) {
      console.error('审核失败:', err);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (task: TaskWithChild) => {
    setProcessingId(task.id);
    try {
      await tasksApi.reject(task.id, notes[task.id]);
      await fetchTasks();
    } catch (err) {
      console.error('拒绝失败:', err);
    } finally {
      setProcessingId(null);
    }
  };

  const handleQuickNote = (taskId: string, text: string) => {
    setNotes(prev => ({ ...prev, [taskId]: text }));
  };

  const pendingCount = tasks.filter(t => t.status === 'pending').length;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex-1 flex flex-col bg-background-light overflow-hidden"
    >
      <header className="sticky top-0 z-10 bg-background-light/80 backdrop-blur-md border-b border-primary/10 px-4 py-4">
        <div className="flex items-center justify-between max-w-md mx-auto">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 hover:bg-primary/10 rounded-full transition-colors"
              aria-label="返回"
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <span className="material-symbols-outlined">shield_person</span>
            </div>
            <h1 className="text-xl font-bold tracking-tight">家长控制</h1>
          </div>
          {/* 显示孩子数量 */}
          {user?.children && user.children.length > 1 && (
            <span className="text-xs text-slate-400 bg-white px-2 py-1 rounded-full border border-slate-200">
              {user.children.length} 个孩子
            </span>
          )}
        </div>
      </header>

      <div className="px-4 py-4 max-w-md mx-auto w-full">
        <div className="flex p-1 bg-primary/10 rounded-xl">
          <button
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${activeTab === 'pending' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-primary'}`}
            onClick={() => setActiveTab('pending')}
          >
            待审核 {pendingCount > 0 && `(${pendingCount})`}
          </button>
          <button
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${activeTab === 'approved' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-primary'}`}
            onClick={() => setActiveTab('approved')}
          >
            已批准
          </button>
        </div>
      </div>

      <main className="flex-1 px-4 pb-32 overflow-y-auto max-w-md mx-auto w-full space-y-4">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <span className="material-symbols-outlined text-primary text-4xl animate-pulse">hourglass_empty</span>
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <span className="material-symbols-outlined text-5xl mb-3 block">task_alt</span>
            <p>{activeTab === 'pending' ? '暂无待审核任务' : '暂无已批准任务'}</p>
          </div>
        ) : (
          tasks.map((task) => (
            <div key={task.id} className="bg-white rounded-2xl shadow-sm border border-primary/5 overflow-hidden">
              <div className="p-4 flex gap-4">
                <div className="w-20 h-20 rounded-xl bg-primary/5 flex items-center justify-center relative overflow-hidden shrink-0 border border-primary/10">
                  {task.image_url ? (
                    <div
                      className="absolute inset-0 bg-cover bg-center opacity-80"
                      style={{ backgroundImage: `url("${task.image_url}")` }}
                    />
                  ) : (
                    <span className="material-symbols-outlined text-primary text-3xl">task_alt</span>
                  )}
                  <div className="absolute bottom-1 right-1 bg-white/90 px-1 rounded text-[10px] font-bold text-primary">{task.progress}%</div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-1.5">
                      {/* 孩子姓名标签 */}
                      {task.childName && (
                        <span className="text-[10px] font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                          {task.childName}
                        </span>
                      )}
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{task.type}</p>
                    </div>
                    <span className="text-[10px] text-slate-400 shrink-0 ml-1">
                      {new Date(task.checkin_time).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 truncate">{task.title}</h3>
                  {task.trees && (
                    <p className="text-sm text-slate-500 mt-1">虚拟树：{task.trees.name}</p>
                  )}
                </div>
              </div>

              {task.status === 'pending' && (
                <>
                  <div className="px-4 pb-4 space-y-3">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                        给 {task.childName || '孩子'} 留言
                      </label>
                      <div className="relative">
                        <input
                          className="w-full bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-primary/20 placeholder:text-slate-400 pr-24"
                          placeholder="留个便条..."
                          type="text"
                          value={notes[task.id] || ''}
                          onChange={e => setNotes(prev => ({ ...prev, [task.id]: e.target.value }))}
                          aria-label="鼓励留言"
                        />
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                          <button className="p-1 hover:bg-primary/10 rounded-full text-lg" onClick={() => handleQuickNote(task.id, '❤️ 太棒了！')}>❤️</button>
                          <button className="p-1 hover:bg-primary/10 rounded-full text-lg" onClick={() => handleQuickNote(task.id, '⭐ 继续加油！')}>⭐</button>
                          <button className="p-1 hover:bg-primary/10 rounded-full text-lg" onClick={() => handleQuickNote(task.id, '👍 为你骄傲！')}>👍</button>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {['太棒了！', '继续加油！', '为你感到骄傲！'].map(text => (
                        <button
                          key={text}
                          className="text-[10px] font-semibold px-2 py-1 rounded-full bg-primary/5 text-primary border border-primary/10 hover:bg-primary hover:text-white transition-colors"
                          onClick={() => handleQuickNote(task.id, text)}
                        >
                          {text}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex border-t border-primary/5">
                    <button
                      className="flex-1 py-4 flex items-center justify-center gap-2 hover:bg-red-50 text-red-500 transition-colors border-r border-primary/5 disabled:opacity-50"
                      onClick={() => handleReject(task)}
                      disabled={processingId === task.id}
                      aria-label="拒绝任务"
                    >
                      <span className="material-symbols-outlined text-xl">cancel</span>
                      <span className="font-bold text-sm">需改进</span>
                    </button>
                    <button
                      className="flex-1 py-4 flex items-center justify-center gap-2 bg-primary/10 hover:bg-primary text-primary hover:text-white transition-all disabled:opacity-50"
                      onClick={() => handleApprove(task)}
                      disabled={processingId === task.id}
                      aria-label="批准任务"
                    >
                      <span className="material-symbols-outlined fill-icon text-xl">check_circle</span>
                      <span className="font-bold text-sm">{processingId === task.id ? '处理中...' : '批准并发送'}</span>
                    </button>
                  </div>
                </>
              )}

              {task.status === 'approved' && (
                <div className="px-4 pb-4 flex items-center gap-2 text-primary">
                  <span className="material-symbols-outlined fill-icon">check_circle</span>
                  <span className="text-sm font-semibold">已批准</span>
                </div>
              )}
            </div>
          ))
        )}
      </main>
    </motion.div>
  );
}
