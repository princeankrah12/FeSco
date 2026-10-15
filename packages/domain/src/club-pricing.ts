import { Vehicle } from './vehicle.types.js';
import { formatPesewasToGhc } from './money.js';

export const MAX_CONTINUITY_STAKE_PESEWAS = 6000;
export const DRIP_STAKE_INCREMENT_PESEWAS = 200;

export interface ClubCommuteReceiptBreakdown {
  totalTripFuelCostPesewas: number;
  totalCommuteFuelCostPesewas: number;
  seatCapacity: 3;
  hostContributionPesewas: number;
  stakeDripPesewas: number;
  updatedStakeTotalPesewas: number;
  totalWalletLockPesewas: number;
  monospaceLines: string[];
}

/**
 * Calculates the legal Club Baseline Rate to ensure 4-week cash neutrality
 * // lexicon-allow: statutory context explaining prevention of Host commercial profit
 * and prevent Host profit when lower-class vehicles are in the rotation.
 */
export function calculateClubBaselineRate(clubVehicles: Vehicle[]): number {
  if (!clubVehicles || clubVehicles.length === 0) {
    throw new Error('Club must contain at least one registered vehicle.');
  }

  // Domain invariant: Club Baseline Rate = MIN(vehicle_svoc_per_seat_pesewas)
  const baselineRatePesewas = clubVehicles.reduce((minRate, vehicle) => {
    return Math.min(minRate, vehicle.svocPerSeatCeilingPesewas);
  }, Infinity);

  return baselineRatePesewas;
}

/**
 * Validates whether a joining member requires the Mixed-Fleet Cost Parity Disclosure.
 */
export function requiresParityDisclosure(newVehicle: Vehicle, currentBaselineRate: number): boolean {
  return newVehicle.svocPerSeatCeilingPesewas > currentBaselineRate;
}

/**
 * Computes the 4-week Carpool Club wallet lock breakdown:
 * - Dynamic Drip-Funding installment capped at (6000 - currentStakePesewas)
 * - Collapses stake line item into 'Secured (GH₵ 60.00)' once fully funded
 * - Generates dual-line monospace receipt for UI and wallet journals
 */
export function calculateClubCommuteLock(params: {
  totalTripFuelCostPesewas?: number;
  totalCommuteFuelCostPesewas?: number;
  clubBaselineRatePesewas: number;
  currentStakePesewas: number;
  dripFundingEnabled: boolean;
}): ClubCommuteReceiptBreakdown {
  const totalCostPesewas = params.totalCommuteFuelCostPesewas ?? params.totalTripFuelCostPesewas ?? 0;
  const hostContributionPesewas = params.clubBaselineRatePesewas;
  const remainingToCap = Math.max(0, MAX_CONTINUITY_STAKE_PESEWAS - params.currentStakePesewas);
  const stakeDripPesewas = params.dripFundingEnabled
    ? Math.max(0, Math.min(DRIP_STAKE_INCREMENT_PESEWAS, remainingToCap))
    : 0;

  const updatedStakeTotalPesewas = params.currentStakePesewas + stakeDripPesewas;
  const totalWalletLockPesewas = hostContributionPesewas + stakeDripPesewas;

  const monospaceLines = [
    `Total Commute Fuel Cost .......... ${formatPesewasToGhc(totalCostPesewas)}`,
    `Vehicle Capacity ................. 3 Seats`,
    `Host Fuel Contribution ........... ${formatPesewasToGhc(hostContributionPesewas)}`,
    ...(stakeDripPesewas > 0
      ? [
          `Refundable Club Stake (${formatPesewasToGhc(updatedStakeTotalPesewas)}/GH₵ 60.00) . ${formatPesewasToGhc(stakeDripPesewas)}`,
        ]
      : [`Club Continuity Stake ............ Secured (GH₵ 60.00)`]),
    `Total Wallet Lock ................ ${formatPesewasToGhc(totalWalletLockPesewas)}`,
  ];

  return {
    totalTripFuelCostPesewas: totalCostPesewas,
    totalCommuteFuelCostPesewas: totalCostPesewas,
    seatCapacity: 3,
    hostContributionPesewas,
    stakeDripPesewas,
    updatedStakeTotalPesewas,
    totalWalletLockPesewas,
    monospaceLines,
  };
}
