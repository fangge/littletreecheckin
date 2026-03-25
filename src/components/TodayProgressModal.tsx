import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { childrenApi, treesApi, type Child, type GoalData } from '../services/api';

interface ChildProgress {
  child: Child;
  totalTasks: number;
  completedTasks: number;
}

export default function TodayProgressModal() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [progressData, setProgressData] = useState<ChildProgress[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);

  // 检查今天是否已经显示过弹层
  const hasShownToday = () => {
    const lastShown = localStorage.getItem('todayProgressLastShown');
    if (!lastShown) return false;
    
    const today = new Date().toDateString();
    return lastShown === today;
  };

  // 标记今天已显示
  const markShownToday = () => {
    localStorage.setItem('todayProgressLastShown', new Date().toDateString());
  };

  // 获取鼓励文字
  const getEncouragementText = (completed: number, total: number) => {
    const remaining = total - completed;
    if (remaining === 0) {
      return '太棒了！今天的任务全部完成！🎉';
    } else if (remaining <= 2) {
      return `太棒了，再加油${remaining}个任务！`;
    } else if (completed === 0) {
      return `今天还有${remaining}个任务，开始行动吧！`;
    } else {
      return `再完成${remaining}个任务，小树就能结果啦！`;
    }
  };

  // 获取孩子头像
  const getChildAvatar = (child: Child) => {
    if (child.avatar) return child.avatar;
    // 根据性别返回默认头像
    if (child.gender === 'male') {
      return 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop&crop=face';
    } else if (child.gender === 'female') {
      return 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face';
    }
    return 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop&crop=face';
  };

  // 加载进度数据
  useEffect(() => {
    const loadProgressData = async () => {
      if (!isAuthenticated || isLoading || !user?.children?.length) return;
      
      // 如果今天已经显示过，不再显示
      if (hasShownToday()) return;

      setIsLoadingData(true);
      try {
        const progressList: ChildProgress[] = [];

        for (const child of user.children) {
          try {
            // 获取孩子的目标（任务）列表
            const goalsResponse = await treesApi.listGoals(child.id, true);
            const goals = goalsResponse.data || [];
            
            // 计算今日任务完成情况
            let completedTasks = 0;
            const today = new Date().toISOString().split('T')[0];
            
            // 遍历每个目标，检查今日是否已完成
            for (const goal of goals) {
              if (goal.trees && goal.trees.length > 0) {
                const tree = goal.trees[0];
                // 使用 checked_in_today 字段判断是否今日已打卡
                if (tree.checked_in_today) {
                  completedTasks++;
                }
              }
            }

            progressList.push({
              child,
              totalTasks: goals.length,
              completedTasks,
            });
          } catch (error) {
            console.error(`获取孩子 ${child.name} 的进度失败:`, error);
          }
        }

        // 只显示有任务的孩子
        const validProgress = progressList.filter(p => p.totalTasks > 0);
        
        if (validProgress.length > 0) {
          setProgressData(validProgress);
          setIsOpen(true);
          markShownToday();
        }
      } catch (error) {
        console.error('加载今日进度失败:', error);
      } finally {
        setIsLoadingData(false);
      }
    };

    // 延迟加载，确保页面已完全加载
    const timer = setTimeout(() => {
      loadProgressData();
    }, 800);

    return () => clearTimeout(timer);
  }, [isAuthenticated, isLoading, user]);

  const handleClose = () => {
    setIsOpen(false);
  };

  if (!isOpen || progressData.length === 0) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="bg-[#1c1c1e] rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* 标题区域 */}
            <div className="px-6 pt-6 pb-4 text-center">
              <h2 className="text-white text-xl font-bold mb-1">今日任务进度</h2>
              <p className="text-gray-400 text-sm">加油，小宝贝们！</p>
            </div>

            {/* 孩子进度列表 */}
            <div className="px-4 pb-4 space-y-3 max-h-[60vh] overflow-y-auto">
              {progressData.map(({ child, totalTasks, completedTasks }) => {
                const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
                
                return (
                  <motion.div
                    key={child.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-[#2c2c2e] rounded-2xl p-4"
                  >
                    {/* 孩子信息头部 */}
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-white font-bold flex-1">{child.name}</span>
                      <span className="text-primary text-sm font-medium">
                        {completedTasks}/{totalTasks} 任务
                      </span>
                    </div>

                    {/* 进度条 */}
                    <div className="mb-3">
                      <div className="h-2.5 bg-[#3a3a3c] rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${progress}%` }}
                          transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
                          className="h-full bg-gradient-to-r from-primary to-green-400 rounded-full"
                        />
                      </div>
                    </div>

                    {/* 鼓励文字 */}
                    <p className="text-gray-400 text-xs">
                      {getEncouragementText(completedTasks, totalTasks)}
                    </p>
                  </motion.div>
                );
              })}
            </div>

            {/* 底部按钮 */}
            <div className="p-4 pt-2">
              <button
                onClick={handleClose}
                className="w-full py-3.5 bg-primary hover:bg-primary/90 text-white font-bold rounded-2xl transition-all active:scale-[0.98]"
              >
                我知道了
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
