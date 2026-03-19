import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, useMotionValue, useTransform, PanInfo } from 'motion/react';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  pullDownThreshold?: number;
  loadingText?: string;
  disabled?: boolean;
}

const PullToRefresh = ({
  onRefresh,
  children,
  pullDownThreshold = 80,
  loadingText = '刷新中...',
  disabled = false
}: PullToRefreshProps) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [canRefresh, setCanRefresh] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const y = useMotionValue(0);
  
  // 将下拉距离转换为指示器的透明度和旋转角度
  const opacity = useTransform(y, [0, pullDownThreshold], [0, 1]);
  const rotate = useTransform(y, [0, pullDownThreshold], [0, 180]);
  
  // 检查是否在页面顶部
  const isAtTop = useCallback(() => {
    if (!containerRef.current) return false;
    const scrollTop = containerRef.current.scrollTop || window.scrollY || document.documentElement.scrollTop;
    return scrollTop === 0;
  }, []);

  // 处理拖拽开始
  const handleDragStart = useCallback(() => {
    if (disabled || isRefreshing || !isAtTop()) {
      return false;
    }
  }, [disabled, isRefreshing, isAtTop]);

  // 处理拖拽中
  const handleDrag = useCallback((_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const dragY = info.offset.y;
    
    // 只允许向下拖拽，且在页面顶部
    if (dragY > 0 && isAtTop()) {
      // 添加阻尼效果
      const dampedY = Math.min(dragY * 0.5, pullDownThreshold * 1.5);
      y.set(dampedY);
      
      // 判断是否达到刷新阈值
      setCanRefresh(dampedY >= pullDownThreshold);
    } else {
      y.set(0);
      setCanRefresh(false);
    }
  }, [y, pullDownThreshold, isAtTop]);

  // 处理拖拽结束
  const handleDragEnd = useCallback(async () => {
    const currentY = y.get();
    
    if (currentY >= pullDownThreshold && !isRefreshing) {
      // 触发刷新
      setIsRefreshing(true);
      setCanRefresh(false);
      
      try {
        await onRefresh();
      } catch (error) {
        console.error('刷新失败:', error);
      } finally {
        setIsRefreshing(false);
        y.set(0);
      }
    } else {
      // 回弹
      y.set(0);
      setCanRefresh(false);
    }
  }, [y, pullDownThreshold, isRefreshing, onRefresh]);

  // 刷新完成后的动画
  useEffect(() => {
    if (!isRefreshing) {
      y.set(0);
    }
  }, [isRefreshing, y]);

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-auto">
      {/* 下拉指示器 */}
      <motion.div
        style={{ opacity }}
        className="fixed top-0 left-0 right-0 flex items-center justify-center pointer-events-none z-50"
      >
        <motion.div
          style={{ y: useTransform(y, (val) => val - 60) }}
          className="flex flex-col items-center gap-2 py-3 px-6 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-700/50"
        >
          {isRefreshing ? (
            // 刷新中状态
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="text-2xl"
              >
                <span className="material-symbols-outlined text-primary">
                  sync
                </span>
              </motion.div>
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                {loadingText}
              </span>
            </>
          ) : canRefresh ? (
            // 可释放状态
            <>
              <motion.div
                style={{ rotate }}
                className="text-2xl"
              >
                <span className="material-symbols-outlined text-primary">
                  arrow_downward
                </span>
              </motion.div>
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                释放刷新
              </span>
            </>
          ) : (
            // 下拉中状态
            <>
              <motion.div
                style={{ rotate }}
                className="text-2xl"
              >
                <span className="material-symbols-outlined text-gray-500 dark:text-gray-400">
                  arrow_downward
                </span>
              </motion.div>
              <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                下拉刷新
              </span>
            </>
          )}
        </motion.div>
      </motion.div>

      {/* 可拖拽的内容区域 */}
      <motion.div
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0}
        onDragStart={handleDragStart}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        style={{ y }}
        className="touch-pan-y"
      >
        {children}
      </motion.div>
    </div>
  );
};

export default PullToRefresh;
