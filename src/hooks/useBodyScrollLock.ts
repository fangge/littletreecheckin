import { useEffect, type RefObject } from 'react';

/**
 * 锁定页面滚动，并阻止触摸弹层背景时把滚动传递给背后的页面。
 * - overflow: hidden 阻止 body 滚动，并补偿滚动条宽度避免布局跳动
 * - 只在触摸目标是弹层背景本身时 preventDefault，弹层内容仍可正常滚动
 */
export default function useBodyScrollLock(
  locked: boolean,
  overlayRef?: RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    if (!locked) return;

    const body = document.body;
    const previousOverflow = body.style.overflow;
    const previousPaddingRight = body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
      body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      body.style.overflow = previousOverflow;
      body.style.paddingRight = previousPaddingRight;
    };
  }, [locked]);

  useEffect(() => {
    if (!locked) return;
    const overlay = overlayRef?.current;
    if (!overlay) return;

    const handleTouchMove = (event: TouchEvent) => {
      // 只有直接触摸遮罩层时才拦截；触摸弹层内容仍允许滚动
      if (event.target === overlay) {
        event.preventDefault();
      }
    };

    overlay.addEventListener('touchmove', handleTouchMove, { passive: false });
    return () => overlay.removeEventListener('touchmove', handleTouchMove);
  }, [locked, overlayRef]);
}
