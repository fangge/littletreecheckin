import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { tasksApi } from '../services/api';

interface PendingTasksContextType {
  pendingCount: number;
  refreshPendingCount: () => Promise<void>;
}

const PendingTasksContext = createContext<PendingTasksContextType>({
  pendingCount: 0,
  refreshPendingCount: async () => {},
});

export const usePendingTasks = () => useContext(PendingTasksContext);

export const PendingTasksProvider = ({ children }: { children: React.ReactNode }) => {
  const { user, isChildMode } = useAuth();
  const [pendingCount, setPendingCount] = useState(0);

  const refreshPendingCount = useCallback(async () => {
    if (isChildMode || !user?.children?.length) {
      setPendingCount(0);
      return;
    }
    try {
      const results = await Promise.all(
        user.children.map(child => tasksApi.listPending(child.id))
      );
      const total = results.reduce((sum, res) => sum + (res.total ?? res.data.length), 0);
      setPendingCount(total);
    } catch {
      // 静默失败，不影响主流程
    }
  }, [user, isChildMode]);

  // 初始加载
  useEffect(() => {
    refreshPendingCount();
  }, [refreshPendingCount]);

  return (
    <PendingTasksContext.Provider value={{ pendingCount, refreshPendingCount }}>
      {children}
    </PendingTasksContext.Provider>
  );
};
