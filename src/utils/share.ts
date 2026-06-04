/**
 * 原生分享工具 - 支持 Web Share API 降级到剪贴板复制
 * 用于打卡成功、勋章解锁等场景的社交分享
 */

interface ShareData {
  title: string;
  text: string;
  url?: string;
}

/**
 * 检测是否支持 Web Share API
 */
export function canNativeShare(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.share;
}

/**
 * 触发原生分享，降级到复制链接
 */
export async function shareContent(data: ShareData): Promise<{ method: 'share' | 'clipboard'; success: boolean }> {
  const url = data.url || window.location.origin;

  if (canNativeShare()) {
    try {
      await navigator.share({
        title: data.title,
        text: data.text,
        url,
      });
      return { method: 'share', success: true };
    } catch (err: unknown) {
      // 用户取消分享不算失败
      if (err instanceof Error && err.name === 'AbortError') {
        return { method: 'share', success: false };
      }
    }
  }

  // 降级：复制到剪贴板
  try {
    await navigator.clipboard.writeText(`${data.title}\n${data.text}\n${url}`);
    return { method: 'clipboard', success: true };
  } catch {
    return { method: 'clipboard', success: false };
  }
}

/**
 * 打卡成功分享文案
 */
export function getCheckinShareText(treeName: string, progress: number): ShareData {
  return {
    title: '成就丛林 - 我的好习惯养成之旅',
    text: `我在「成就丛林」坚持打卡，${treeName}已经成长到 ${progress}% 啦！🌳 每天进步一点点，一起来养成好习惯吧！`,
  };
}

/**
 * 勋章解锁分享文案
 */
export function getMedalShareText(medalName: string): ShareData {
  return {
    title: '成就丛林 - 解锁新勋章！',
    text: `我在「成就丛林」解锁了「${medalName}」勋章！🏅 坚持打卡，成就更好的自己！`,
  };
}
