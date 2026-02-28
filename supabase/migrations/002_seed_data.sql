-- ============================================================
-- 成就丛林 - 种子数据：勋章定义 & 初始奖励
-- ============================================================

-- ============================================================
-- 勋章定义（9枚，与前端 constants.ts 对应）
-- ============================================================
INSERT INTO medals (id, name, icon, color, description, unlock_condition) VALUES
(
  uuid_generate_v4(),
  '早起小标兵',
  'wb_sunny',
  'from-yellow-300 to-primary',
  '连续7天在早上8点前完成打卡',
  '{"type": "early_checkin", "threshold": 7}'
),
(
  uuid_generate_v4(),
  '7天连续达人',
  'local_fire_department',
  'from-orange-400 to-red-500',
  '连续7天完成任务打卡',
  '{"type": "consecutive_days", "threshold": 7}'
),
(
  uuid_generate_v4(),
  '浇水小能手',
  'water_drop',
  'from-blue-400 to-blue-600',
  '累计完成30次任务打卡',
  '{"type": "total_tasks", "threshold": 30}'
),
(
  uuid_generate_v4(),
  '水果采摘员',
  'nutrition',
  'from-slate-300 to-slate-400',
  '完成第一棵树木的培育',
  '{"type": "trees_completed", "threshold": 1}'
),
(
  uuid_generate_v4(),
  '根深蒂固',
  'forest',
  'from-slate-300 to-slate-400',
  '完成5棵树木的培育',
  '{"type": "trees_completed", "threshold": 5}'
),
(
  uuid_generate_v4(),
  '闪亮之星',
  'stars',
  'from-purple-400 to-indigo-600',
  '累计获得500个果实',
  '{"type": "total_fruits", "threshold": 500}'
),
(
  uuid_generate_v4(),
  '环保小英雄',
  'eco',
  'from-emerald-400 to-teal-600',
  '累计完成100次任务打卡',
  '{"type": "total_tasks", "threshold": 100}'
),
(
  uuid_generate_v4(),
  '快速成长期',
  'energy_savings_leaf',
  'from-slate-300 to-slate-400',
  '在一周内完成3个不同目标的打卡',
  '{"type": "weekly_goals", "threshold": 3}'
),
(
  uuid_generate_v4(),
  '顶尖选手',
  'emoji_events',
  'from-slate-300 to-slate-400',
  '累计完成200次任务打卡',
  '{"type": "total_tasks", "threshold": 200}'
);

-- ============================================================
-- 初始奖励数据（与前端 constants.ts 对应）
-- ============================================================
INSERT INTO rewards (id, name, price, image, category, is_active) VALUES
(
  uuid_generate_v4(),
  '30分钟游戏时间',
  200,
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCJXo5JmQpCTp3DS_gYEYEKvrpiDTo-5BCO5MUyRYh8MEVJ4cbo1pBRt7sMgtonU_S6ITPrli8ciPJa20Dq8Ahvw0o0B1DBfN12hPlZAOxEZ5IEL8UYAecx4J1_zC5veB1A6FNgwwGlrcCqxSNaDrzQSUh3uBDbWkKK8C9aVsNN5VvkAKGuOv3tVW5hvTzdrFXqvnpwMdWE0u6asOQWF_2euexex29x5Vh9oKS9bLtnl1yAiubCcHoZxdUEw-EQ3BvHWlFlR43IHgYK',
  'activity',
  TRUE
),
(
  uuid_generate_v4(),
  '新玩具',
  1000,
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDteOcpm2oHVY0AudRaMksYxFcORLynQEMJ4-rRXxjQcN7P_jyhGitMRO-11dYoUCETOqK286AHm8egxNHJgE3xauHNameN0TDl2zqYiWwH5-HDBwDk0lO_ai7fHoIz1IP5ieAtecU0JYvU90_dwixjEWg5ipFsECSnvwG0nnosG0WshHb4zCzbW7OhdIp0DfBLYx3i_ABw3E8W8-0fmOZiijS4Guxx55G1kslOtYk8z1mSGS-3iPiGATbn3Nei_G3ke1fN7dKrhEev',
  'toy',
  TRUE
),
(
  uuid_generate_v4(),
  '冰淇淋',
  150,
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBZKZTS-qPjt6Wj4riS58CMxhcbNjjwvaJeQRfG13CPoUpIvkIgwbmliGgJqGotsGpoINeoqc97MAKl_qG92UkzgrbINCkp6JZb_gWZkGExXoqk18dSD-URxHVO6V9bdwh94Ey9d7389hfQCUJuzrbDJpydHWQMw49_8rmRcPoFKIEiX5VETExqL0bUaQpbM-Deg80T6LNBFQUixuspozGtnPvy-fQgVu7O2Qgsrf9cWaW1dHtJjg4-Ry2eyTRjHY_6J2b1XvthwQKI',
  'snack',
  TRUE
),
(
  uuid_generate_v4(),
  '额外公园游玩',
  300,
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBUsLXvqd7DOSeRsLa4Msgk9SvHR-hmD7CiLNXMMhTuM9zD5wjVsnLbwmLTwrNunaA0SRknUFJprO1IkG5ZTcviIH6guzUT_-MTwRRRX0KiQBihfOKcsOwBddGaWIRN3kEpVAqGpU5rbMQZxQZA50422ovV4mAdi6nsuI0yC0mV8NL-AklA8jvTSqIaRugnmUe1HY432ZChx7QUdOSqz8N0CgqbQx1ouk37a4GqyDyu1UiGPhFcvMesEGRGhlu2Q7CRKzQY147QidB7',
  'activity',
  TRUE
),
(
  uuid_generate_v4(),
  '电影之夜',
  500,
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCvVh-1dXlrXa13oubvqk8jT-RYChfRmVD8HbPhXIz7E3bw8TtVsC54g706B-YNSz-IaPg8himJe6mJfoezln3VOaYfEglQt8TVAoWXidBRvbIic_6sEDoGYf8j7geF6qZ7eIWSGo08hQ5or7gnO2dDmse6nBA5GlpsHsA0Zfyn7X0qEE3BUVPyzne5VGQTPIQYNYoUa9fwtDD4gYY-ZYzBF6vUgV71wHHBJvUmrZQXqBvblReM43-MfQ7b8XO7Wr5tquBqvQEAPGwN',
  'activity',
  TRUE
),
(
  uuid_generate_v4(),
  '晚睡1小时',
  300,
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCHiLlHIfV4lmVGySKG5_QHwAf7ktROvBp_eWErI54w6PF3Tww7Akwy8FEoCODT4yxb731JfT5OHc0Kbh6zStDPSP5sfsWFAhSwXxrIUrhHTvkY81cwG6jypJ7Tmf3saJmV5fqjsFFLGcqbcxq_3C_V4M0iui83-xAzM22AzFb5IJ02nEkyhYvEn7dHbtRqPrwgCE94GHsMJrN7jxyMXKgu1ekIcxVG6XF5Zbq7TnepBvdIaScmXn6ZhudLEctyEaMH2BWdiEVeWTJQ',
  'activity',
  TRUE
);