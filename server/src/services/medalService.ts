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

  // 计算连续打卡天数
  const consecutiveDays = await getConsecutiveDays(childId);

  const stats = {
    total_tasks: totalApproved || 0,
    trees_completed: completedTrees || 0,
    total_fruits: childData?.fruits_balance || 0,
    consecutive_days: consecutiveDays,
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
        shouldUnlock = stats.consecutive_days >= condition.threshold;
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

// 计算连续打卡天数
const getConsecutiveDays = async (childId: string): Promise<number> => {
  const { data: tasks } = await supabase
    .from('tasks')
    .select('checkin_time')
    .eq('child_id', childId)
    .eq('status', 'approved')
    .order('checkin_time', { ascending: false })
    .limit(30);

  if (!tasks || tasks.length === 0) return 0;

  // 获取唯一日期集合
  const dates = new Set(
    tasks.map((t: { checkin_time: string }) => new Date(t.checkin_time).toISOString().split('T')[0])
  );

  let consecutive = 0;
  const today = new Date();

  for (let i = 0; i < 30; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    if (dates.has(dateStr)) {
      consecutive++;
    } else {
      break;
    }
  }

  return consecutive;
};