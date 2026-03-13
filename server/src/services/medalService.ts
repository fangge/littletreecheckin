import { supabase } from '../config/supabase.js';

interface MedalCondition {
  type: 'consecutive_days' | 'total_tasks' | 'trees_completed' | 'total_fruits' | 'early_checkin' | 'weekly_goals';
  threshold: number;
}

// 检查并解锁符合条件的勋章
export const checkAndUnlockMedals = async (childId: string): Promise<void> => {
  // 获取所有勋章定义
  const { data: allMedals } = await supabase
    .from('medals')
    .select('id, name, unlock_condition');

  if (!allMedals || allMedals.length === 0) return;

  // 获取已解锁的勋章 ID
  const { data: unlockedMedals } = await supabase
    .from('child_medals')
    .select('medal_id')
    .eq('child_id', childId);

  const unlockedIds = new Set(unlockedMedals?.map((m: { medal_id: string }) => m.medal_id) || []);

  // 获取孩子统计数据
  const { count: totalApproved } = await supabase
    .from('tasks')
    .select('id', { count: 'exact' })
    .eq('child_id', childId)
    .eq('status', 'approved');

  const { count: completedTrees } = await supabase
    .from('trees')
    .select('id', { count: 'exact' })
    .eq('child_id', childId)
    .eq('status', 'completed');

  const { data: childData } = await supabase
    .from('children')
    .select('fruits_balance')
    .eq('id', childId)
    .single();

  // 计算连续打卡天数（只按日期，不判断具体时间）
  const consecutiveDays = await getConsecutiveDays(childId);

  // 计算一周内完成的不同目标数
  const weeklyGoals = await getWeeklyGoalsCount(childId);

  const stats = {
    total_tasks: totalApproved || 0,
    trees_completed: completedTrees || 0,
    total_fruits: childData?.fruits_balance || 0,
    consecutive_days: consecutiveDays,
    weekly_goals: weeklyGoals,
  };

  // 检查每个未解锁的勋章
  const toUnlock: string[] = [];

  for (const medal of allMedals) {
    if (unlockedIds.has(medal.id)) continue;

    const condition = medal.unlock_condition as MedalCondition;
    let shouldUnlock = false;

    switch (condition.type) {
      case 'total_tasks':
        shouldUnlock = stats.total_tasks >= condition.threshold;
        break;
      case 'trees_completed':
        shouldUnlock = stats.trees_completed >= condition.threshold;
        break;
      case 'total_fruits':
        shouldUnlock = stats.total_fruits >= condition.threshold;
        break;
      case 'consecutive_days':
      case 'early_checkin':
        // 早起小标兵也按连续天数判断，只看日期是否连续
        shouldUnlock = stats.consecutive_days >= condition.threshold;
        break;
      case 'weekly_goals':
        shouldUnlock = stats.weekly_goals >= condition.threshold;
        break;
    }

    if (shouldUnlock) {
      toUnlock.push(medal.id);
    }
  }

  // 批量解锁勋章
  if (toUnlock.length > 0) {
    await supabase.from('child_medals').insert(
      toUnlock.map(medalId => ({ child_id: childId, medal_id: medalId }))
    );
  }
};

// 计算连续打卡天数（只按日期，不判断具体时间）
const getConsecutiveDays = async (childId: string): Promise<number> => {
  // 使用 SQL 直接查询，获取所有有打卡的日期（去重）
  const { data: dates, error } = await supabase
    .from('tasks')
    .select('checkin_time')
    .eq('child_id', childId)
    .eq('status', 'approved');

  if (error || !dates || dates.length === 0) return 0;

  // 将 checkin_time 转为北京时间日期（UTC+8）
  const dateSet = new Set(
    dates.map(d => {
      const date = new Date(d.checkin_time);
      const utc8Date = new Date(date.getTime() + 8 * 60 * 60 * 1000);
      return utc8Date.toISOString().split('T')[0];
    })
  );

  // 获取所有打卡日期并排序（最新的在前面）
  const sortedDates = Array.from(dateSet).sort().reverse();

  // 获取今天的北京时间日期
  const now = new Date();
  const todayUTC8 = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  const todayStr = todayUTC8.toISOString().split('T')[0];

  let consecutive = 0;

  for (let i = 0; i < 365; i++) {
    const date = new Date(todayUTC8);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    if (!sortedDates.includes(dateStr)) {
      // 如果今天还没打卡（i=0），跳过继续检查昨天
      if (i === 0) {
        continue;
      }
      break;
    }

    consecutive++;
  }

  return consecutive;
};

// 计算一周内完成的不同目标数
const getWeeklyGoalsCount = async (childId: string): Promise<number> => {
  // 获取一周前的时间戳（UTC）
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const { data: tasks } = await supabase
    .from('tasks')
    .select('goal_id, checkin_time')
    .eq('child_id', childId)
    .eq('status', 'approved')
    .gte('checkin_time', oneWeekAgo.toISOString());

  if (!tasks || tasks.length === 0) return 0;

  // 将 checkin_time 转为北京时间日期，过滤一周内的记录
  const now = new Date();
  const nowUTC8 = now.getTime() + 8 * 60 * 60 * 1000;
  const oneWeekAgoUTC8 = new Date(nowUTC8 - 7 * 24 * 60 * 60 * 1000);
  const oneWeekAgoStr = oneWeekAgoUTC8.toISOString().split('T')[0];

  // 统计不同 goal_id 的数量
  const uniqueGoals = new Set(
    tasks
      .map(t => {
        const date = new Date(new Date(t.checkin_time).getTime() + 8 * 60 * 60 * 1000);
        return date.toISOString().split('T')[0] >= oneWeekAgoStr ? t.goal_id : null;
      })
      .filter(Boolean)
  );

  return uniqueGoals.size;
};