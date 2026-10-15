import { Money } from './money.js';
import { EngineClass, calculateTotalCommuteOperatingCost } from './svoc.js';

export interface CancellationInput {
  scheduledDeparture: Date;
  cancelledAt: Date;
  seatContribution: Money;
  actualDetourKmIncurred?: number;
  engineClass?: EngineClass;
}

export interface CancellationSettlement {
  penaltyPercent: 0 | 50 | 100;
  totalPenalty: Money;
  refundToCoCommuter: Money;
  hostDetourReimbursement: Money;
  rescuePoolAllocation: Money;
}

/**
 * Calculates cancellation settlement according to the Rescue Pool compliance rules.
 *
 * Rules:
 * - T >= 30 mins before departure: 0% penalty (100% refund to Co-Commuter).
 * - 10 <= T < 30 mins before departure: 50% penalty.
 * - T < 10 mins before departure (or post-departure): 100% penalty.
 *
 * Host Remittance:
 * - Host only receives compensation for verified kilometric detours actually driven,
 *   calculated strictly via SVOC.
 * - Any excess penalty is transferred to the centralized FeSCo Rescue Pool.
 * - Host NEVER receives cancellation surplus, preserving cost-recovery compliance.
 */
export function calculateCancellationSettlement(
  input: CancellationInput,
): CancellationSettlement {
  const diffMs = input.scheduledDeparture.getTime() - input.cancelledAt.getTime();
  const minutesBeforeDeparture = Math.floor(diffMs / 60000);

  let penaltyPercent: 0 | 50 | 100 = 0;

  if (minutesBeforeDeparture >= 30) {
    penaltyPercent = 0;
  } else if (minutesBeforeDeparture >= 10) {
    penaltyPercent = 50;
  } else {
    penaltyPercent = 100;
  }

  const penaltyPesewas = Math.round(
    (input.seatContribution.pesewas * penaltyPercent) / 100,
  );
  const totalPenalty = Money.fromPesewas(penaltyPesewas);
  const refundToCoCommuter = input.seatContribution.subtract(totalPenalty);

  // Calculate Host actual detour cost if Host incurred detour
  let hostDetourCost = Money.zero();
  if (
    input.actualDetourKmIncurred &&
    input.actualDetourKmIncurred > 0 &&
    input.engineClass
  ) {
    hostDetourCost = calculateTotalCommuteOperatingCost(
      input.actualDetourKmIncurred,
      input.engineClass,
    );
  }

  // Host cannot be paid more than the total penalty
  const hostDetourReimbursement = hostDetourCost.greaterThan(totalPenalty)
    ? totalPenalty
    : hostDetourCost;

  // Remainder always flows into the FeSCo Rescue Pool
  const rescuePoolAllocation = totalPenalty.subtract(hostDetourReimbursement);

  return {
    penaltyPercent,
    totalPenalty,
    refundToCoCommuter,
    hostDetourReimbursement,
    rescuePoolAllocation,
  };
}
