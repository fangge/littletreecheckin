export interface RewardRedemptionRules {
  max_redemptions?: number | null;
  max_consecutive_redemptions?: number | null;
  cooldown_days?: number | null;
}

export interface RewardRedemptionRecord {
  quantity?: number | null;
  redeemed_at: string;
}

export interface RewardRedemptionAvailability {
  redeemed_quantity: number;
  remaining_redemptions: number | null;
  consecutive_redeemed_quantity: number;
  consecutive_remaining: number | null;
  cooldown_until: string | null;
  available_quantity: number | null;
}

export const calculateRewardRedemptionAvailability = (
  rules: RewardRedemptionRules,
  records: RewardRedemptionRecord[],
  now = new Date(),
): RewardRedemptionAvailability => {
  const redeemedQuantity = records.reduce((total, record) => total + (record.quantity ?? 1), 0);
  const remainingRedemptions = rules.max_redemptions == null
    ? null
    : Math.max(0, rules.max_redemptions - redeemedQuantity);

  let consecutiveRedeemedQuantity = 0;
  let consecutiveRemaining: number | null = null;
  let cooldownUntil: string | null = null;

  if (rules.max_consecutive_redemptions != null && rules.cooldown_days != null) {
    const sortedRecords = [...records].sort(
      (a, b) => new Date(b.redeemed_at).getTime() - new Date(a.redeemed_at).getTime(),
    );
    const cooldownMs = rules.cooldown_days * 24 * 60 * 60 * 1000;
    const latestRecord = sortedRecords[0];

    if (latestRecord) {
      const latestTime = new Date(latestRecord.redeemed_at).getTime();
      const cooldownEndTime = latestTime + cooldownMs;

      if (now.getTime() < cooldownEndTime) {
        consecutiveRedeemedQuantity = latestRecord.quantity ?? 1;
        let newerRecordTime = latestTime;

        for (let index = 1; index < sortedRecords.length; index += 1) {
          const record = sortedRecords[index];
          const recordTime = new Date(record.redeemed_at).getTime();
          if (newerRecordTime - recordTime >= cooldownMs) break;

          consecutiveRedeemedQuantity += record.quantity ?? 1;
          newerRecordTime = recordTime;
        }

        if (consecutiveRedeemedQuantity >= rules.max_consecutive_redemptions) {
          cooldownUntil = new Date(cooldownEndTime).toISOString();
        }
      }
    }

    consecutiveRemaining = Math.max(
      0,
      rules.max_consecutive_redemptions - consecutiveRedeemedQuantity,
    );
  }

  const limits = [remainingRedemptions, consecutiveRemaining].filter(
    (value): value is number => value != null,
  );

  return {
    redeemed_quantity: redeemedQuantity,
    remaining_redemptions: remainingRedemptions,
    consecutive_redeemed_quantity: consecutiveRedeemedQuantity,
    consecutive_remaining: consecutiveRemaining,
    cooldown_until: cooldownUntil,
    available_quantity: limits.length > 0 ? Math.min(...limits) : null,
  };
};
