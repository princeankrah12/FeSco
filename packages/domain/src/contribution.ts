import { Money } from './money.js';

export const MAX_COCOMMUTER_CAPACITY = 3;

/**
 * Calculates the fixed per-seat Fuel Contribution.
 *
 * Legal mandate ("Hostile-Auditor-Proof"):
 * - Total Cost is divided by max vehicle capacity (3 seats).
 * - Division ALWAYS uses floor-rounding in integer pesewas.
 * - This mathematically guarantees that (seat_contribution * 3) <= total_cost.
 * - The host never recovers more than actual SVOC costs, even if all 3 seats board.
 */
export function calculateSeatContribution(
  totalCost: Money,
  capacity = MAX_COCOMMUTER_CAPACITY,
): Money {
  if (capacity <= 0) {
    throw new RangeError('Capacity must be at least 1');
  }
  return totalCost.floorDivide(capacity);
}

/**
 * Verifies that the sum of seat contributions across all seats never exceeds total operating cost.
 */
export function verifyNotForProfitInvariant(
  totalCost: Money,
  seatContribution: Money,
  seatsFilled = MAX_COCOMMUTER_CAPACITY,
): { isCompliant: boolean; maxPossibleRecovery: Money; costDifferential: Money } {
  const maxPossibleRecovery = seatContribution.multiply(seatsFilled);
  const isCompliant = maxPossibleRecovery.lessThanOrEqual(totalCost);
  const costDifferential = totalCost.subtract(maxPossibleRecovery);

  return {
    isCompliant,
    maxPossibleRecovery,
    costDifferential,
  };
}
