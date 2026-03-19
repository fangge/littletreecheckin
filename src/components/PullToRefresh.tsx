import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, useMotionValue, useTransform } from 'motion/react';

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
  const [isPulling, setIsPulling] = useState(false);
  const [canRefresh, setCanRefresh] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const startX = useRef(0);
  const isVerticalPull = useRef(false);
  const y = useMotionValue(0);
  
  // 将下拉距离转换为指示器的透明度和旋转角度
  const opacity = useTransform(y, [0, pullDownThreshold], [0, 1]);
  const rotate = useTransform(y, [0, pullDownThreshold], [0, 180]);
  const indicatorY = useTransform(y, (val) => val - 60);
  const textOpacity = useTransform(y, [0, pullDownThreshold * 0.5, pullDownThreshold], [0, 0.5, 1]);
  
  // 检测是否为移动设备
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024); // lg breakpoint
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // 检查是否在页面顶部
  const isAtTop = useCallback(() => {
    if (!containerRef.current) return false;
    return containerRef.current.scrollTop === 0;
  }, []);

  // 处理触摸开始
  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!isMobile || disabled || isRefreshing || !isAtTop()) {
      return;
    }
    startY.current = e.touches[0].clientY;
    startX.current = e.touches[0].clientX;
    isVerticalPull.current = false;
    setIsPulling(true);
  }, [isMobile, disabled, isRefreshing, isAtTop]);

  // 处理触摸移动
  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isMobile || !isPulling || disabled || isRefreshing) {
      return;
    }

    const currentY = e.touches[0].clientY;
    const currentX = e.touches[0].clientX;
    const deltaY = currentY - startY.current;
    const deltaX = currentX - startX.current;
    
    // 首次移动时判断是纵向还是横向滚动
    if (!isVerticalPull.current && (Math.abs(deltaY) > 5 || Math.abs(deltaX) > 5)) {
      // 如果横向移动距离大于纵向移动距离，则认为是横向滚动
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        // 横向滚动，不拦截
        setIsPulling(false);
        return;
      } else {
        // 纵向滚动
        isVerticalPull.current = true;
      }
    }
    
    // 只处理纵向下拉，且在页面顶部
    if (isVerticalPull.current && deltaY > 0 && isAtTop()) {
      // 只在真正需要时才阻止默认行为
      if (e.cancelable) {
        e.preventDefault();
      }
      
      // 添加阻尼效果
      const dampedY = Math.min(deltaY * 0.5, pullDownThreshold * 1.5);
      y.set(dampedY);
      
      // 更新是否可以刷新的状态
      setCanRefresh(dampedY >= pullDownThreshold);
    } else {
      y.set(0);
      setCanRefresh(false);
    }
  }, [isMobile, isPulling, disabled, isRefreshing, isAtTop, y, pullDownThreshold]);

  // 处理触摸结束
  const handleTouchEnd = useCallback(async () => {
    if (!isPulling) return;
    
    setIsPulling(false);
    isVerticalPull.current = false;
    const pullDistance = y.get();
    
    if (pullDistance >= pullDownThreshold && !isRefreshing) {
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
  }, [isPulling, y, pullDownThreshold, isRefreshing, onRefresh]);

  // 添加触摸事件监听（仅移动端）
  useEffect(() => {
    if (!isMobile) return;
    
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isMobile, handleTouchStart, handleTouchMove, handleTouchEnd]);

  // 刷新完成后的动画
  useEffect(() => {
    if (!isRefreshing) {
      y.set(0);
      setCanRefresh(false);
    }
  }, [isRefreshing, y]);

  // 桌面端：使用普通布局，不启用下拉刷新
  if (!isMobile) {
    return <>{children}</>;
  }

  // 移动端：使用下拉刷新布局
  return (
    <div ref={containerRef} className="absolute inset-0 overflow-auto">
      {/* 下拉指示器 */}
      <motion.div
        style={{ opacity }}
        className="fixed top-0 left-0 right-0 flex items-center justify-center pointer-events-none z-50"
      >
        <motion.div
          style={{ y: indicatorY }}
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
          ) : (
            // 下拉状态
            <>
              <motion.div
                style={{ rotate }}
                className="text-2xl"
              >
                <span className="material-symbols-outlined text-primary">
                  arrow_downward
                </span>
              </motion.div>
              <motion.span 
                className="text-sm font-semibold text-gray-700 dark:text-gray-300"
                style={{ opacity: textOpacity }}
              >
                {canRefresh ? '释放刷新' : '下拉刷新'}
              </motion.span>
            </>
          )}
        </motion.div>
      </motion.div>

      {/* 内容区域 */}
      <motion.div style={{ y }} className="min-h-full">
        {children}
      </motion.div>
    </div>
  );
};

export default PullToRefresh;
