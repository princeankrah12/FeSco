import {
  EngineClass,
  Money,
  SVOC_RATE_REGISTRY,
  CURRENT_SVOC_VERSION,
  calculateTotalCommuteOperatingCost,
  calculateSeatContribution,
  recalculateCommuteCostJit,
  JitRecalculationResult,
  SvocRateConfig,
} from '@fesco/domain';

export interface CommuteCostCalculationInput {
  distanceKm: number;
  engineClass: EngineClass;
  quotedRateVersion?: string;
  coCommuterSeats?: number;
}

export interface CommuteCostCalculationResult {
  distanceKm: number;
  engineClass: EngineClass;
  appliedRateVersion: string;
  npaWindowLabel: string;
  totalOperatingCostPesewas: number;
  seatContributionPesewas: number;
  totalOperatingCostFormatted: string;
  seatContributionFormatted: string;
  isNpaRateAdjusted: boolean;
  badgeLabel: string | null;
  jitDetails?: JitRecalculationResult;
}

export class SvocService {
  private activeVersionCode = CURRENT_SVOC_VERSION;

  getActiveRateConfig(): SvocRateConfig {
    const config = SVOC_RATE_REGISTRY[this.activeVersionCode];
    if (!config) {
      throw new Error(`Active SVOC rate version not found: ${this.activeVersionCode}`);
    }
    return config;
  }

  setActiveVersion(versionCode: string): void {
    if (!SVOC_RATE_REGISTRY[versionCode]) {
      throw new Error(`Invalid SVOC version: ${versionCode}`);
    }
    this.activeVersionCode = versionCode;
  }

  /**
   * Calculates commute operating cost and per-seat Fuel Contribution.
   * If a quoted rate version is provided (soft quote from draft), performs JIT recalculation.
   */
  calculateCost(input: CommuteCostCalculationInput): CommuteCostCalculationResult {
    const seats = input.coCommuterSeats ?? 3;
    const activeConfig = this.getActiveRateConfig();

    if (input.quotedRateVersion && input.quotedRateVersion !== this.activeVersionCode) {
      // Perform JIT Recalculation
      const jit = recalculateCommuteCostJit(
        input.quotedRateVersion,
        this.activeVersionCode,
        input.distanceKm,
        input.engineClass,
        seats,
      );

      const totalCost = calculateTotalCommuteOperatingCost(
        input.distanceKm,
        input.engineClass,
        jit.isNpaRateAdjusted ? this.activeVersionCode : input.quotedRateVersion,
      );

      return {
        distanceKm: input.distanceKm,
        engineClass: input.engineClass,
        appliedRateVersion: jit.isNpaRateAdjusted ? this.activeVersionCode : input.quotedRateVersion,
        npaWindowLabel: activeConfig.npaWindowLabel,
        totalOperatingCostPesewas: totalCost.pesewas,
        seatContributionPesewas: jit.effectiveSeatContribution.pesewas,
        totalOperatingCostFormatted: totalCost.toFormattedCedis(),
        seatContributionFormatted: jit.effectiveSeatContribution.toFormattedCedis(),
        isNpaRateAdjusted: jit.isNpaRateAdjusted,
        badgeLabel: jit.badgeLabel,
        jitDetails: jit,
      };
    }

    // Standard calculation under active rate version
    const totalCost = calculateTotalCommuteOperatingCost(
      input.distanceKm,
      input.engineClass,
      this.activeVersionCode,
    );
    const seatContribution = calculateSeatContribution(totalCost, seats);

    return {
      distanceKm: input.distanceKm,
      engineClass: input.engineClass,
      appliedRateVersion: this.activeVersionCode,
      npaWindowLabel: activeConfig.npaWindowLabel,
      totalOperatingCostPesewas: totalCost.pesewas,
      seatContributionPesewas: seatContribution.pesewas,
      totalOperatingCostFormatted: totalCost.toFormattedCedis(),
      seatContributionFormatted: seatContribution.toFormattedCedis(),
      isNpaRateAdjusted: false,
      badgeLabel: null,
    };
  }
}
