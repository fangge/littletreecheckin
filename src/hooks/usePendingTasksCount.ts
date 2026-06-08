import { usePendingTasks } from '../contexts/PendingTasksContext';

/**
 * 向后兼容的 hook 封装，返回待审核任务总数
 * 如需 refreshPendingCount，请直接使用 usePendingTasks()
 */
export const usePendingTasksCount = () => {
  const { pendingCount } = usePendingTasks();
  return pendingCount;
};
