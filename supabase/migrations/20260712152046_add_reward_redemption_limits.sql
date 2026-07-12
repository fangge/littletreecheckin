ALTER TABLE IF EXISTS public.rewards
  ADD COLUMN IF NOT EXISTS max_redemptions INTEGER CHECK (max_redemptions > 0),
  ADD COLUMN IF NOT EXISTS max_consecutive_redemptions INTEGER CHECK (max_consecutive_redemptions > 0),
  ADD COLUMN IF NOT EXISTS cooldown_days INTEGER CHECK (cooldown_days > 0);

ALTER TABLE IF EXISTS public.rewards
  DROP CONSTRAINT IF EXISTS rewards_consecutive_cooldown_pair_check;

ALTER TABLE IF EXISTS public.rewards
  ADD CONSTRAINT rewards_consecutive_cooldown_pair_check CHECK (
    (max_consecutive_redemptions IS NULL AND cooldown_days IS NULL)
    OR
    (max_consecutive_redemptions IS NOT NULL AND cooldown_days IS NOT NULL)
  );
