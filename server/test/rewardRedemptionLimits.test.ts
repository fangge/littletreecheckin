import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateRewardRedemptionAvailability } from '../src/utils/rewardRedemptionLimits.js';

const NOW = new Date('2026-07-12T12:00:00.000Z');

test('calculates reward redemption limits and cooldown cycles', () => {
  const lifetimeResult = calculateRewardRedemptionAvailability(
    { max_redemptions: 10 },
    [{ quantity: 8, redeemed_at: '2026-07-12T08:00:00.000Z' }],
    NOW,
  );

  assert.equal(lifetimeResult.redeemed_quantity, 8);
  assert.equal(lifetimeResult.remaining_redemptions, 2);
  assert.equal(2 <= (lifetimeResult.available_quantity ?? Number.POSITIVE_INFINITY), true);
  assert.equal(3 <= (lifetimeResult.available_quantity ?? Number.POSITIVE_INFINITY), false);

  const blockedResult = calculateRewardRedemptionAvailability(
    { max_consecutive_redemptions: 3, cooldown_days: 7 },
    [
      { quantity: 2, redeemed_at: '2026-07-12T08:00:00.000Z' },
      { quantity: 1, redeemed_at: '2026-07-10T08:00:00.000Z' },
    ],
    NOW,
  );

  assert.equal(blockedResult.consecutive_redeemed_quantity, 3);
  assert.equal(blockedResult.available_quantity, 0);
  assert.equal(blockedResult.cooldown_until, '2026-07-19T08:00:00.000Z');

  const cooledDownResult = calculateRewardRedemptionAvailability(
    { max_consecutive_redemptions: 3, cooldown_days: 7 },
    [
      { quantity: 2, redeemed_at: '2026-07-01T08:00:00.000Z' },
      { quantity: 1, redeemed_at: '2026-06-30T08:00:00.000Z' },
    ],
    NOW,
  );

  assert.equal(cooledDownResult.consecutive_redeemed_quantity, 0);
  assert.equal(cooledDownResult.available_quantity, 3);

  const resetByGapResult = calculateRewardRedemptionAvailability(
    { max_consecutive_redemptions: 4, cooldown_days: 3 },
    [
      { quantity: 2, redeemed_at: '2026-07-12T08:00:00.000Z' },
      { quantity: 3, redeemed_at: '2026-07-09T08:00:00.000Z' },
    ],
    NOW,
  );

  assert.equal(resetByGapResult.consecutive_redeemed_quantity, 2);
  assert.equal(resetByGapResult.available_quantity, 2);
});
