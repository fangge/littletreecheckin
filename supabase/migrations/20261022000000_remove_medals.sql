-- ============================================================
-- 移除勋章系统
-- 勋章墙、勋章管理、解锁检测及所有勋章数据整体下线
-- ============================================================

DROP TABLE IF EXISTS public.child_medals CASCADE;
DROP TABLE IF EXISTS public.medals CASCADE;

-- 注册触发器原本会向 medals 写入 9 枚默认勋章，这里同步改为只创建 profile，
-- 避免新用户注册时因勋章表已删除而失败。
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;
