ALTER TABLE IF EXISTS public.reward_redemptions
  ADD COLUMN IF NOT EXISTS quantity INTEGER NOT NULL DEFAULT 1
  CHECK (quantity > 0);
