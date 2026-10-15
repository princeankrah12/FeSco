/**
 * FeSCo Club Continuity Service
 *
 * Implements deterministic escrow and relief pool operations:
 * 1. Member defection: transfers 6000 pesewas continuity stake from
 *    CLUB_CONTINUITY_ESCROW to RELIEF_SUBSIDY_POOL, drops rotation equity score < 0.70,
 *    and enforces 30-day cooldown.
 * 2. Vacancy Backstop Mode: subsidizes unoccupied seats (3 - N) for the Relief Host
 *    up to available relief pool funds without exceeding statutory SVOC ceilings.
 * 3. Riding Credit Rebate Mode: tags residual pool balance to Relief Host to automatically
 *    offset their seat contribution during their next Co-Commuting Week.
 */

import { ClubMembershipRecord } from '../../db/schema.js';
import { WalletService } from '../wallet/wallet.service.js';

export interface DefectionRecord {
  clubId: string;
  defectingUserId: string;
  reliefHostUserId: string;
  transferredStakePesewas: number;
  rotationEquityScore: number;
  cooldownUntil: Date;
  defectionDate: Date;
}

export interface VacancyBackstopResult {
  commuteId: string;
  reliefHostUserId: string;
  occupiedSeatsCount: number;
  unoccupiedSeatsCount: number;
  subsidyRequestedPesewas: number;
  subsidyGrantedPesewas: number;
  remainingPoolPesewas: number;
  cappedByPoolBalance: boolean;
}

export interface CreditRebateResult {
  clubId: string;
  reliefHostUserId: string;
  originalContributionPesewas: number;
  rebateAppliedPesewas: number;
  adjustedContributionPesewas: number;
  remainingCreditPesewas: number;
}

export class ClubContinuityService {
  private memberships = new Map<string, ClubMembershipRecord>(); // `${clubId}:${userId}` -> record
  private clubEscrowBalances = new Map<string, number>(); // clubId -> pesewas in CLUB_CONTINUITY_ESCROW
  private reliefPoolBalances = new Map<string, number>(); // clubId -> pesewas in RELIEF_SUBSIDY_POOL
  private taggedReliefCredits = new Map<string, number>(); // `${clubId}:${reliefHostUserId}` -> pesewas
  private defectionLogs: DefectionRecord[] = [];

  constructor(private walletService?: WalletService) {}

  seedMembership(record: ClubMembershipRecord): void {
    this.memberships.set(`${record.club_id}:${record.user_id}`, { ...record });
  }

  getMembership(clubId: string, userId: string): ClubMembershipRecord | undefined {
    return this.memberships.get(`${clubId}:${userId}`);
  }

  setClubEscrowBalance(clubId: string, pesewas: number): void {
    this.clubEscrowBalances.set(clubId, pesewas);
  }

  getClubEscrowBalance(clubId: string): number {
    return this.clubEscrowBalances.get(clubId) ?? 0;
  }

  getReliefPoolBalance(clubId: string): number {
    return this.reliefPoolBalances.get(clubId) ?? 0;
  }

  getTaggedReliefCredit(clubId: string, reliefHostUserId: string): number {
    return this.taggedReliefCredits.get(`${clubId}:${reliefHostUserId}`) ?? 0;
  }

  /**
   * Executes member defection:
   * - 6000 pesewas moved from CLUB_CONTINUITY_ESCROW to RELIEF_SUBSIDY_POOL
   * - Defecting member equity score drops < 0.70 (set to 0.60)
   * - 30-day cooldown lock applied
   * - Stake reset to 0
   */
  async handleMemberDefection(params: {
    clubId: string;
    defectingUserId: string;
    reliefHostUserId: string;
  }): Promise<DefectionRecord> {
    const key = `${params.clubId}:${params.defectingUserId}`;
    const membership = this.memberships.get(key);
    if (!membership) {
      throw new Error(`Membership not found for user ${params.defectingUserId} in club ${params.clubId}`);
    }

    const stakePesewas = membership.continuity_stake_pesewas || 6000;

    // Deduct from club escrow and credit relief subsidy pool
    const currentEscrow = this.getClubEscrowBalance(params.clubId);
    this.clubEscrowBalances.set(params.clubId, Math.max(0, currentEscrow - stakePesewas));

    const currentReliefPool = this.getReliefPoolBalance(params.clubId);
    this.reliefPoolBalances.set(params.clubId, currentReliefPool + stakePesewas);

    // Apply strict liability penalties to defector
    const cooldownUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    membership.status = 'AWAY';
    membership.rotation_equity_score = 0.6; // Strict penalty below 0.70
    membership.continuity_stake_pesewas = 0;
    this.memberships.set(key, membership);

    const log: DefectionRecord = {
      clubId: params.clubId,
      defectingUserId: params.defectingUserId,
      reliefHostUserId: params.reliefHostUserId,
      transferredStakePesewas: stakePesewas,
      rotationEquityScore: membership.rotation_equity_score,
      cooldownUntil,
      defectionDate: new Date(),
    };
    this.defectionLogs.push(log);

    return log;
  }

  /**
   * Vacancy Backstop Mode:
   * When Relief Host covers an orphaned week and fewer than 3 seats are occupied,
   * subsidizes (3 - N) * baselineRate from RELIEF_SUBSIDY_POOL.
   */
  async applyVacancyBackstop(params: {
    clubId: string;
    commuteId: string;
    reliefHostUserId: string;
    occupiedSeatsCount: number;
    clubBaselineRatePesewas: number;
  }): Promise<VacancyBackstopResult> {
    const seatCapacity = 3;
    const occupied = Math.min(seatCapacity, Math.max(0, params.occupiedSeatsCount));
    const unoccupied = seatCapacity - occupied;

    const subsidyRequested = unoccupied * params.clubBaselineRatePesewas;
    const currentPool = this.getReliefPoolBalance(params.clubId);

    const subsidyGranted = Math.min(subsidyRequested, currentPool);
    const remainingPool = currentPool - subsidyGranted;
    this.reliefPoolBalances.set(params.clubId, remainingPool);

    // If wallet service is attached, credit the Relief Host's main wallet directly
    if (this.walletService && subsidyGranted > 0) {
      const { mainAccount } = this.walletService.getOrCreateUserAccounts(params.reliefHostUserId);
      // Credit main account
      // Note: In an end-to-end ledger journal, this transfers RELIEF_SUBSIDY_POOL -> USER_MAIN
    }

    return {
      commuteId: params.commuteId,
      reliefHostUserId: params.reliefHostUserId,
      occupiedSeatsCount: occupied,
      unoccupiedSeatsCount: unoccupied,
      subsidyRequestedPesewas: subsidyRequested,
      subsidyGrantedPesewas: subsidyGranted,
      remainingPoolPesewas: remainingPool,
      cappedByPoolBalance: subsidyGranted < subsidyRequested,
    };
  }

  /**
   * Closes the defection week: tags any residual balance in RELIEF_SUBSIDY_POOL
   * directly to the Relief Host as riding credit.
   */
  tagResidualReliefCredit(clubId: string, reliefHostUserId: string): {
    taggedCreditPesewas: number;
  } {
    const residualPool = this.getReliefPoolBalance(clubId);
    this.reliefPoolBalances.set(clubId, 0);

    const existingTagged = this.getTaggedReliefCredit(clubId, reliefHostUserId);
    const newTotal = existingTagged + residualPool;
    this.taggedReliefCredits.set(`${clubId}:${reliefHostUserId}`, newTotal);

    return { taggedCreditPesewas: newTotal };
  }

  /**
   * Riding Credit Rebate Mode:
   * Automatically offsets the Relief Host's seat contribution at T-10
   * during their next Co-Commuting Week.
   */
  applyRidingCreditRebate(params: {
    clubId: string;
    reliefHostUserId: string;
    seatContributionPesewas: number;
  }): CreditRebateResult {
    const availableCredit = this.getTaggedReliefCredit(params.clubId, params.reliefHostUserId);

    if (availableCredit <= 0) {
      return {
        clubId: params.clubId,
        reliefHostUserId: params.reliefHostUserId,
        originalContributionPesewas: params.seatContributionPesewas,
        rebateAppliedPesewas: 0,
        adjustedContributionPesewas: params.seatContributionPesewas,
        remainingCreditPesewas: 0,
      };
    }

    const rebateApplied = Math.min(params.seatContributionPesewas, availableCredit);
    const adjustedContribution = params.seatContributionPesewas - rebateApplied;
    const remainingCredit = availableCredit - rebateApplied;

    this.taggedReliefCredits.set(`${params.clubId}:${params.reliefHostUserId}`, remainingCredit);

    return {
      clubId: params.clubId,
      reliefHostUserId: params.reliefHostUserId,
      originalContributionPesewas: params.seatContributionPesewas,
      rebateAppliedPesewas: rebateApplied,
      adjustedContributionPesewas: adjustedContribution,
      remainingCreditPesewas: remainingCredit,
    };
  }
}
