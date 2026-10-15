import { Money } from './money.js';

/**
 * Standardized Vehicle Operating Cost (SVOC) Engine
 *
 * Rates are strictly fixed by engine displacement classification (derived from DVLA).
 * Hosts cannot modify or customize these rates.
 */

export type EngineClass = 'A' | 'B' | 'C';

export interface SvocRateConfig {
  version: string;
  effectiveFrom: string;
  npaWindowLabel: string;
  source: string;
  rates: {
    A: number; // in pesewas per km
    B: number; // in pesewas per km
    C: number; // in pesewas per km
  };
}

/**
 * Versioned SVOC rate registry.
 * Aligns with National Petroleum Authority (NPA) bi-weekly windows.
 */
export const SVOC_RATE_REGISTRY: Record<string, SvocRateConfig> = {
  '2026.1-DVLA': {
    version: '2026.1-DVLA',
    effectiveFrom: '2026-01-01',
    npaWindowLabel: '2026-Window-01',
    source: 'DVLA & NPA Baseline 2026',
    rates: {
      A: 140, // GH₵ 1.40 / km (< 1500cc)
      B: 210, // GH₵ 2.10 / km (1500cc - 2500cc)
      C: 333, // GH₵ 3.33 / km (> 2500cc)
    },
  },
  '2025.24-DVLA': {
    version: '2025.24-DVLA',
    effectiveFrom: '2025-12-16',
    npaWindowLabel: '2025-Window-24',
    source: 'DVLA & NPA December 2025',
    rates: {
      A: 150, // GH₵ 1.50 / km (< 1500cc)
      B: 220, // GH₵ 2.20 / km (1500cc - 2500cc)
      C: 345, // GH₵ 3.45 / km (> 2500cc)
    },
  },
};

export const CURRENT_SVOC_VERSION = '2026.1-DVLA';

/**
 * Classifies vehicle engine capacity in cubic centimetres (cc) into SVOC classes.
 */
export function classifyEngineByCapacity(cc: number): EngineClass {
  if (cc < 1500) {
    return 'A';
  }
  if (cc <= 2500) {
    return 'B';
  }
  return 'C';
}

/**
 * Returns the per-kilometre SVOC rate in Money.
 */
export function getSvocRate(
  engineClass: EngineClass,
  version = CURRENT_SVOC_VERSION,
): Money {
  const config = SVOC_RATE_REGISTRY[version];
  if (!config) {
    throw new Error(`Unknown SVOC rate version: ${version}`);
  }
  return Money.fromPesewas(config.rates[engineClass]);
}

/**
 * Calculates total fuel & wear-and-tear operating cost for a given commute distance.
 * Math: Math.round(distanceKm * ratePerKmPesewas)
 */
export function calculateTotalCommuteOperatingCost(
  distanceKm: number,
  engineClass: EngineClass,
  version = CURRENT_SVOC_VERSION,
): Money {
  if (distanceKm < 0) {
    throw new RangeError('Commute distance cannot be negative');
  }
  const rate = getSvocRate(engineClass, version);
  const totalPesewas = Math.round(distanceKm * rate.pesewas);
  return Money.fromPesewas(totalPesewas);
}

export interface JitRecalculationResult {
  quotedRateVersion: string;
  activeRateVersion: string;
  quotedSeatContribution: Money;
  activeSeatContribution: Money;
  effectiveSeatContribution: Money;
  isNpaRateAdjusted: boolean;
  badgeLabel: string | null;
  differencePesewas: number;
}

/**
 * JIT Recalculation at T-30 minutes:
 *
 * Checks the commute's quoted SVOC rate version against the current active NPA rate.
 * - If fuel pump rates dropped: applies lower active rate, sets isNpaRateAdjusted: true ("NPA Rate Adjusted").
 * - If fuel pump rates rose: honors lower quoted rate for this commute to protect Co-Commuters from unexpected increases.
 */
export function recalculateCommuteCostJit(
  quotedRateVersion: string,
  activeRateVersion: string,
  distanceKm: number,
  engineClass: EngineClass,
  capacity = 3,
): JitRecalculationResult {
  const quotedTotalCost = calculateTotalCommuteOperatingCost(distanceKm, engineClass, quotedRateVersion);
  const quotedSeatContribution = quotedTotalCost.floorDivide(capacity);

  const activeTotalCost = calculateTotalCommuteOperatingCost(distanceKm, engineClass, activeRateVersion);
  const activeSeatContribution = activeTotalCost.floorDivide(capacity);

  if (activeSeatContribution.lessThan(quotedSeatContribution)) {
    // Fuel rates dropped! Pass savings directly to Co-Commuter
    const differencePesewas = quotedSeatContribution.subtract(activeSeatContribution).pesewas;
    return {
      quotedRateVersion,
      activeRateVersion,
      quotedSeatContribution,
      activeSeatContribution,
      effectiveSeatContribution: activeSeatContribution,
      isNpaRateAdjusted: true,
      badgeLabel: 'NPA Rate Adjusted',
      differencePesewas,
    };
  }

  // Fuel rates remained the same or increased. Honor the quoted lower rate.
  return {
    quotedRateVersion,
    activeRateVersion,
    quotedSeatContribution,
    activeSeatContribution,
    effectiveSeatContribution: quotedSeatContribution,
    isNpaRateAdjusted: false,
    badgeLabel: null,
    differencePesewas: 0,
  };
}

export { formatPesewasToGhc } from './money.js';
