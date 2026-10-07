-- 下架不再使用的内置默认奖品，并保留关联兑换历史。
UPDATE public.rewards
SET is_active = FALSE
WHERE (name, price, category) IN (
  ('30分钟游戏时间', 200, 'activity'),
  ('新玩具', 1000, 'toy'),
  ('冰淇淋', 150, 'snack'),
  ('额外公园游玩', 300, 'activity'),
  ('电影之夜', 500, 'activity'),
  ('晚睡1小时', 300, 'activity')
);
