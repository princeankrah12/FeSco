/**
 * FeSCo AI Concierge Service
 *
 * Monitors Carpool Club operations, detects delay patterns anchored strictly
 * to boarding initiation (never arrival), and generates proactive Concierge Proposals.
 */

export interface HistoricalBoardingRecord {
  id: string;
  clubId: string;
  commuteId: string;
  commuteDate: string; // ISO 'YYYY-MM-DD'
  isoWeekday: number; // 1 (Mon) .. 5 (Fri)
  scheduledDepartureTime: Date;
  actualHostUserId: string;
  actualHostBoardingStart: Date;
  delayMinutes: number;
}

export type ProposalType = 'SINGLE_DAY_RELIEF_SWAP' | 'TIME_SHIFT';

export interface ConciergeProposal {
  id: string;
  clubId: string;
  type: ProposalType;
  targetHostUserId: string;
  counterpartyHostUserId?: string;
  isoWeekday: number;
  consecutiveDelaysCount: number;
  averageDelayMinutes: number;
  recommendedAction: string;
  targetCommuteDate?: string;
  reciprocalCommuteDate?: string;
  proposedShiftMinutes?: number;
  newDepartureTime?: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'RESOLVED';
  votes: Record<string, 'ACCEPT' | 'REJECT'>;
  swapApprovals: Record<string, boolean>;
  createdAt: Date;
  expiresAt: Date;
}

export class AiConciergeService {
  private boardingRecords = new Map<string, HistoricalBoardingRecord[]>();
  private proposals = new Map<string, ConciergeProposal>();

  /**
   * Logs a boarding initiation event.
   * Delay is measured strictly from scheduled departure to actual boarding start:
   * delta_t = actualHostBoardingStart - scheduledDeparture
   */
  recordBoardingInitiation(params: {
    clubId: string;
    commuteId: string;
    commuteDate: string;
    isoWeekday: number;
    scheduledDepartureTime: Date;
    actualHostUserId: string;
    actualHostBoardingStart: Date;
  }): HistoricalBoardingRecord {
    const delayMinutes = Math.max(
      0,
      Math.round(
        (params.actualHostBoardingStart.getTime() - params.scheduledDepartureTime.getTime()) / 60000,
      ),
    );

    const record: HistoricalBoardingRecord = {
      id: `brd_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      clubId: params.clubId,
      commuteId: params.commuteId,
      commuteDate: params.commuteDate,
      isoWeekday: params.isoWeekday,
      scheduledDepartureTime: params.scheduledDepartureTime,
      actualHostUserId: params.actualHostUserId,
      actualHostBoardingStart: params.actualHostBoardingStart,
      delayMinutes,
    };

    const records = this.boardingRecords.get(params.clubId) ?? [];
    records.push(record);
    this.boardingRecords.set(params.clubId, records);

    return record;
  }

  /**
   * Evaluates delay patterns across historical records for a club:
   * Triggers iff the same actualHostUserId initiates boarding > 30 minutes
   * after scheduled departure on >= 3 consecutive occurrences of the same ISO weekday (1..5).
   */
  evaluateClubDelayPatterns(params: {
    clubId: string;
    candidateReliefHostUserId?: string;
    reciprocalDate?: string;
  }): ConciergeProposal[] {
    const clubHistory = this.boardingRecords.get(params.clubId) ?? [];
    if (clubHistory.length === 0) return [];

    const generatedProposals: ConciergeProposal[] = [];

    // Group by host and ISO weekday
    const groups = new Map<string, HistoricalBoardingRecord[]>();
    for (const r of clubHistory) {
      const key = `${r.actualHostUserId}_weekday_${r.isoWeekday}`;
      const group = groups.get(key) ?? [];
      group.push(r);
      groups.set(key, group);
    }

    for (const [key, records] of groups.entries()) {
      // Sort chronologically ascending
      records.sort((a, b) => a.commuteDate.localeCompare(b.commuteDate));

      // Check consecutive occurrences delayed by > 30 mins
      let consecutiveDelays = 0;
      let totalDelayMins = 0;
      const delayedRecords: HistoricalBoardingRecord[] = [];

      for (let i = records.length - 1; i >= 0; i--) {
        const r = records[i]!;
        if (r.delayMinutes > 30) {
          consecutiveDelays++;
          totalDelayMins += r.delayMinutes;
          delayedRecords.unshift(r);
        } else {
          break; // Streak broken
        }
      }

      if (consecutiveDelays >= 3) {
        const hostId = records[0]!.actualHostUserId;
        const weekday = records[0]!.isoWeekday;
        const avgDelay = Math.round(totalDelayMins / consecutiveDelays);
        const latestDelayedDate = delayedRecords[delayedRecords.length - 1]!.commuteDate;

        const weekdayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
        const dayLabel = weekdayNames[weekday - 1] ?? `Day ${weekday}`;

        const proposalId = `prop_swap_${params.clubId}_${hostId}_d${weekday}_${Date.now()}`;
        const proposal: ConciergeProposal = {
          id: proposalId,
          clubId: params.clubId,
          type: 'SINGLE_DAY_RELIEF_SWAP',
          targetHostUserId: hostId,
          counterpartyHostUserId: params.candidateReliefHostUserId,
          isoWeekday: weekday,
          consecutiveDelaysCount: consecutiveDelays,
          averageDelayMinutes: avgDelay,
          recommendedAction: `Detected ${consecutiveDelays} consecutive ${dayLabel} morning boarding delays (avg +${avgDelay}m). Propose single-day relief swap with ${params.candidateReliefHostUserId ?? 'available club peer'}.`,
          targetCommuteDate: latestDelayedDate,
          reciprocalCommuteDate: params.reciprocalDate,
          status: 'PENDING',
          votes: {},
          swapApprovals: {},
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h consensus window
        };

        this.proposals.set(proposal.id, proposal);
        generatedProposals.push(proposal);
      }
    }

    return generatedProposals;
  }

  /**
   * Generates a consensus proposal to shift departure time (e.g. +15m or +30m)
   * after chronic recurring route congestion or mutual agreement.
   */
  createTimeShiftProposal(params: {
    clubId: string;
    targetHostUserId: string;
    isoWeekday: number;
    shiftMinutes: number;
    newDepartureTime: string;
  }): ConciergeProposal {
    const proposalId = `prop_shift_${params.clubId}_${Date.now()}`;
    const proposal: ConciergeProposal = {
      id: proposalId,
      clubId: params.clubId,
      type: 'TIME_SHIFT',
      targetHostUserId: params.targetHostUserId,
      isoWeekday: params.isoWeekday,
      consecutiveDelaysCount: 3,
      averageDelayMinutes: params.shiftMinutes,
      proposedShiftMinutes: params.shiftMinutes,
      newDepartureTime: params.newDepartureTime,
      recommendedAction: `Shift regular departure by +${params.shiftMinutes} minutes to ${params.newDepartureTime} to align with corridor traffic flow.`,
      status: 'PENDING',
      votes: {},
      swapApprovals: {},
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    };

    this.proposals.set(proposal.id, proposal);
    return proposal;
  }

  getProposal(proposalId: string): ConciergeProposal | undefined {
    return this.proposals.get(proposalId);
  }

  listClubProposals(clubId: string): ConciergeProposal[] {
    return Array.from(this.proposals.values()).filter((p) => p.clubId === clubId);
  }
}
